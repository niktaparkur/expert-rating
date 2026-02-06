import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  Button,
  Div,
  Spinner,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderButton,
  Avatar,
  InfoRow,
  Tabs,
  TabsItem,
  SimpleCell,
  Alert,
  PanelHeaderBack,
  Snackbar,
  IconButton,
  FormItem,
  Select,
  FormLayoutGroup,
  Search,
  Placeholder,
  ActionSheet,
  ActionSheetItem,
  usePlatform,
  Platform,
  Text,
  Cell,
  ScreenSpinner,
  Separator,
  HorizontalScroll,
} from "@vkontakte/vkui";
import {
  Icon16Cancel,
  Icon24Cancel,
  Icon28MoreVertical,
  Icon56UsersOutline,
} from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useApi } from "../hooks/useApi";
import { useUiStore } from "../store/uiStore";
import debounce from "lodash.debounce";
import { RequestCard } from "../components/Admin/RequestCard";
import { PromoCodeCard } from "../components/Admin/PromoCodeCard";
import { PromoCodeEditModal } from "../components/Admin/PromoCodeEditModal";
import { PromoCodeDetailsModal } from "../components/Admin/PromoCodeDetailsModal";
import { UserData } from "../types";
import { useUserStore } from "../store/userStore";

interface MailingRequest {
  id: number;
  expert_vk_id: number;
  message: string;
  created_at: string;
}

interface ExpertRequest {
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
  regalia: string;
  social_link: string;
  performance_link: string;
  region: string;
  topics: string[];
}

interface EventRequest {
  id: number;
  name: string;
  description?: string;
  promo_word: string;
  expert_id: number;
  duration_minutes: number;
  event_date: string;
  event_link?: string;
}

interface UpdateRequest {
  id: number;
  expert_vk_id: number;
  new_data: {
    region?: string;
    regalia?: string;
    social_link?: string;
    performance_link?: string;
  };
  status: string;
  created_at: string;
  expert_info: any;
}

interface AdminPanelProps {
  id: string;
}

export const Admin = ({ id }: AdminPanelProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiPost, apiPut, apiDelete } = useApi();
  const { setPopout, setSnackbar } = useUiStore();
  const platform = usePlatform();
  const usersObserverRef = useRef<HTMLDivElement>(null);
  const promoObserverRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useUserStore();

  useEffect(() => {
    if (currentUser && !currentUser.is_admin) {
      routeNavigator.push("/");
    }
  }, [currentUser, routeNavigator]);

  if (!currentUser?.is_admin) return null;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("moderation");
  const [activeSheet, setActiveSheet] = useState<React.ReactNode | null>(null);

  const [expertRequests, setExpertRequests] = useState<ExpertRequest[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<ExpertRequest | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<EventRequest | null>(null);
  const [loadingModeration, setLoadingModeration] = useState(true);

  const [users, setUsers] = useState<UserData[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [usersSearch, setUsersSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [usersFilter, setUsersFilter] = useState({ type: "all", date: "desc" });

  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoCodesPage, setPromoCodesPage] = useState(1);
  const [loadingPromoCodes, setLoadingPromoCodes] = useState(false);
  const [hasMorePromoCodes, setHasMorePromoCodes] = useState(true);
  const [selectedPromoCode, setSelectedPromoCode] = useState<any | null>(null);

  const [mailingRequests, setMailingRequests] = useState<MailingRequest[]>([]);
  const [loadingMailings, setLoadingMailings] = useState(true);
  const [selectedMailing, setSelectedMailing] = useState<MailingRequest | null>(
    null,
  );

  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const showErrorSnackbar = (message: string) =>
    setSnackbar(
      <Snackbar
        duration={3000}
        onClose={() => setSnackbar(null)}
        before={<Icon16Cancel />}
      >
        {message}
      </Snackbar>,
    );

  const fetchMailingData = useCallback(async () => {
    setLoadingMailings(true);
    try {
      const mailingsData = await apiGet<MailingRequest[]>(
        "/mailings/admin/pending",
      );
      setMailingRequests(mailingsData || []);
    } catch (e) {
      showErrorSnackbar((e as Error).message || "Ошибка загрузки рассылок");
    } finally {
      setLoadingMailings(false);
    }
  }, [apiGet, setSnackbar]);

  const fetchModerationData = useCallback(async () => {
    setLoadingModeration(true);
    try {
      const [expertsData, eventsData] = await Promise.all([
        apiGet<ExpertRequest[]>("/experts/admin/pending"),
        apiGet<EventRequest[]>("/events/admin/pending"),
      ]);
      setExpertRequests(expertsData || []);
      setEventRequests(eventsData || []);
    } catch (e) {
      showErrorSnackbar((e as Error).message || "Ошибка загрузки заявок");
    } finally {
      setLoadingModeration(false);
    }
  }, [apiGet, setSnackbar]);

  const fetchUpdatesData = useCallback(async () => {
    setLoadingUpdates(true);
    try {
      const data = await apiGet<UpdateRequest[]>("/experts/admin/updates");
      setUpdateRequests(data || []);
    } catch (e) {
      showErrorSnackbar((e as Error).message || "Ошибка загрузки обновлений");
    } finally {
      setLoadingUpdates(false);
    }
  }, [apiGet, setSnackbar]);

  const fetchUsersData = useCallback(
    async (isNewSearch = false) => {
      if (loadingUsers) return;
      setLoadingUsers(true);
      const currentPage = isNewSearch ? 1 : usersPage;
      const params = new URLSearchParams({
        page: String(currentPage),
        size: "50",
        search: debouncedSearch,
        user_type: usersFilter.type,
        sort_by_date: usersFilter.date,
      });
      try {
        const usersData = await apiGet<any>(
          `/experts/admin/all_users?${params.toString()}`,
        );
        setUsers((prev) =>
          isNewSearch ? usersData.items : [...prev, ...usersData.items],
        );
        setHasMoreUsers(currentPage * 50 < usersData.total_count);
        if (isNewSearch) setUsersPage(2);
        else setUsersPage((p) => p + 1);
      } catch (e) {
        showErrorSnackbar(
          (e as Error).message || "Ошибка загрузки пользователей",
        );
      } finally {
        setLoadingUsers(false);
      }
    },
    [
      apiGet,
      loadingUsers,
      usersPage,
      debouncedSearch,
      usersFilter,
      setSnackbar,
    ],
  );

  const fetchPromoCodes = useCallback(
    async (isNewSearch = false) => {
      if (loadingPromoCodes) return;
      setLoadingPromoCodes(true);
      const currentPage = isNewSearch ? 1 : promoCodesPage;
      try {
        const data = await apiGet<any>(
          `/promo/admin?page=${currentPage}&size=50`,
        );
        setPromoCodes((prev) =>
          isNewSearch ? data.items : [...prev, ...data.items],
        );
        setHasMorePromoCodes(currentPage * 50 < data.total_count);
        if (isNewSearch) setPromoCodesPage(2);
        else setPromoCodesPage((p) => p + 1);
      } catch (e) {
        showErrorSnackbar((e as Error).message || "Ошибка загрузки промокодов");
      } finally {
        setLoadingPromoCodes(false);
      }
    },
    [apiGet, loadingPromoCodes, promoCodesPage, setSnackbar],
  );

  const debouncedSetSearch = useMemo(
    () => debounce((query: string) => setDebouncedSearch(query), 500),
    [],
  );

  useEffect(() => {
    debouncedSetSearch(usersSearch);
  }, [usersSearch, debouncedSetSearch]);

  useEffect(() => {
    if (selectedTab === "moderation") fetchModerationData();
    // if (selectedTab === "mailings") fetchMailingData();
    if (selectedTab === "updates") fetchUpdatesData();
  }, [selectedTab, fetchModerationData, fetchMailingData]);

  useEffect(() => {
    if (selectedTab === "users") {
      setUsers([]);
      setUsersPage(1);
      setHasMoreUsers(true);
      fetchUsersData(true);
    }
  }, [selectedTab, debouncedSearch, usersFilter]);

  // useEffect(() => {
  //   if (selectedTab === "promo") {
  //     setPromoCodes([]);
  //     setPromoCodesPage(1);
  //     setHasMorePromoCodes(true);
  //     fetchPromoCodes(true);
  //   }
  // }, [selectedTab]);

  useEffect(() => {
    if (selectedTab !== "users") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreUsers && !loadingUsers)
          fetchUsersData();
      },
      { threshold: 1.0 },
    );
    const currentObserverRef = usersObserverRef.current;
    if (currentObserverRef) observer.observe(currentObserverRef);
    return () => {
      if (currentObserverRef) observer.unobserve(currentObserverRef);
    };
  }, [selectedTab, hasMoreUsers, loadingUsers, fetchUsersData]);

  useEffect(() => {
    if (selectedTab !== "promo") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMorePromoCodes &&
          !loadingPromoCodes
        )
          fetchPromoCodes();
      },
      { threshold: 1.0 },
    );
    const currentObserverRef = promoObserverRef.current;
    if (currentObserverRef) observer.observe(currentObserverRef);
    return () => {
      if (currentObserverRef) observer.unobserve(currentObserverRef);
    };
  }, [selectedTab, hasMorePromoCodes, loadingPromoCodes, fetchPromoCodes]);

  const openExpertRequest = (request: ExpertRequest) => {
    setSelectedExpert(request);
    setActiveModal("expert-details");
  };

  const openEventRequest = (event: EventRequest) => {
    setSelectedEvent(event);
    setActiveModal("event-details");
  };

  const closeModal = () => {
    setActiveModal(null);
    setTimeout(() => {
      setSelectedExpert(null);
      setSelectedEvent(null);
      setSelectedMailing(null);
    }, 200);
  };

  const handleMailingAction = async (
    mailingId: number,
    action: "approve" | "reject",
  ) => {
    setActiveModal(null);
    setPopout(<ScreenSpinner state="loading" />);
    try {
      const body = action === "reject" ? { reason: "Нарушение правил" } : {};
      await apiPost(`/mailings/admin/${mailingId}/${action}`, body);
      setMailingRequests((prev) => prev.filter((req) => req.id !== mailingId));
    } catch (err) {
      showErrorSnackbar((err as Error).message);
    } finally {
      setPopout(null);
    }
  };

  const handleExpertAction = async (
    vkId: number,
    action: "approve" | "reject",
  ) => {
    closeModal();
    setPopout(<ScreenSpinner state="loading" />);
    try {
      await apiPost(`/experts/admin/${vkId}/${action}`, {});
      setExpertRequests((prev) => prev.filter((req) => req.vk_id !== vkId));
    } catch (err) {
      showErrorSnackbar((err as Error).message);
    } finally {
      setPopout(null);
    }
  };

  const handleUpdateAction = async (
    requestId: number,
    action: "approve" | "reject",
  ) => {
    setPopout(<ScreenSpinner state="loading" />);
    try {
      await apiPost(`/experts/admin/updates/${requestId}/${action}`, {});
      setUpdateRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      showErrorSnackbar((err as Error).message);
    } finally {
      setPopout(null);
    }
  };

  const handleEventAction = async (
    eventId: number,
    action: "approve" | "reject",
  ) => {
    closeModal();
    setPopout(<ScreenSpinner state="loading" />);
    try {
      const body = action === "reject" ? { reason: "Нарушение правил" } : {};
      await apiPost(`/events/admin/${eventId}/${action}`, body);
      setEventRequests((prev) => prev.filter((req) => req.id !== eventId));
    } catch (err) {
      showErrorSnackbar((err as Error).message);
    } finally {
      setPopout(null);
    }
  };

  const handleDeleteUser = (userToDelete: UserData) => {
    const performDelete = async () => {
      setPopout(<ScreenSpinner state="loading" />);
      try {
        await apiPost(`/experts/admin/${userToDelete.vk_id}/delete`, {});
        setUsers((prev) => prev.filter((u) => u.vk_id !== userToDelete.vk_id));
      } catch (err) {
        showErrorSnackbar((err as Error).message);
      } finally {
        setPopout(null);
      }
    };
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Удалить",
            mode: "destructive",
            action: performDelete,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение действия"
        description={`Удалить пользователя ${userToDelete.first_name} ${userToDelete.last_name}?`}
      />,
    );
  };

  const openUserMenu = (
    event: React.MouseEvent<HTMLElement>,
    user: UserData,
  ) => {
    const handleCloseSheet = () => setActiveSheet(null);
    setActiveSheet(
      <ActionSheet
        onClose={handleCloseSheet}
        iosCloseItem={<ActionSheetItem mode="cancel">Отмена</ActionSheetItem>}
        toggleRef={event.currentTarget}
        style={{
          paddingBottom: "60px",
        }}
      >
        {user.is_expert && (
          <ActionSheetItem
            onClick={() => {
              handleCloseSheet();
              routeNavigator.push(`/expert/${user.vk_id}`);
            }}
          >
            Посмотреть профиль
          </ActionSheetItem>
        )}
        <ActionSheetItem
          mode="destructive"
          onClick={() => {
            handleCloseSheet();
            handleDeleteUser(user);
          }}
        >
          Удалить
        </ActionSheetItem>
        {platform !== Platform.IOS && (
          <ActionSheetItem mode="cancel">Отмена</ActionSheetItem>
        )}
      </ActionSheet>,
    );
  };

  const openPromoCodeModal = (promo: any | null) => {
    setSelectedPromoCode(promo);
    setActiveModal("promo-edit-modal");
  };

  const handleSavePromoCode = async (promoData: any) => {
    setPopout(<ScreenSpinner state="loading" />);
    try {
      if (promoData.id) {
        await apiPut(`/promo/admin/${promoData.id}`, promoData);
      } else {
        await apiPost("/promo/admin", promoData);
      }
      setActiveModal(null);
      fetchPromoCodes(true);
    } catch (err) {
      showErrorSnackbar((err as Error).message);
    } finally {
      setPopout(null);
    }
  };

  const handleDeletePromoCode = async (promoId: number) => {
    const performDelete = async () => {
      setPopout(<ScreenSpinner state="loading" />);
      try {
        await apiDelete(`/promo/admin/${promoId}`);
        setActiveModal(null);
        fetchPromoCodes(true);
      } catch (err) {
        showErrorSnackbar((err as Error).message);
      } finally {
        setPopout(null);
      }
    };
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Удалить",
            mode: "destructive",
            action: performDelete,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите удалить этот промокод?"
      />,
    );
  };

  const openPromoMenu = (event: React.MouseEvent<HTMLElement>, promo: any) => {
    setSelectedPromoCode(promo);
    const handleCloseSheet = () => setActiveSheet(null);
    setActiveSheet(
      <ActionSheet
        onClose={handleCloseSheet}
        iosCloseItem={<ActionSheetItem mode="cancel">Отмена</ActionSheetItem>}
        toggleRef={event.currentTarget}
        style={{
          paddingBottom: "60px",
        }}
      >
        <ActionSheetItem
          onClick={() => {
            handleCloseSheet();
            setActiveModal("promo-details-modal");
          }}
        >
          Детали
        </ActionSheetItem>
        <ActionSheetItem
          onClick={() => {
            handleCloseSheet();
            setActiveModal("promo-edit-modal");
          }}
        >
          Редактировать
        </ActionSheetItem>
        {platform !== Platform.IOS && (
          <ActionSheetItem mode="cancel">Отмена</ActionSheetItem>
        )}
      </ActionSheet>,
    );
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={closeModal}>
      <ModalPage
        id="expert-details"
        onClose={closeModal}
        header={
          <ModalPageHeader
            before={<PanelHeaderBack onClick={closeModal} />}
            after={
              <PanelHeaderButton onClick={closeModal}>
                <Icon24Cancel />
              </PanelHeaderButton>
            }
          >
            Заявка эксперта
          </ModalPageHeader>
        }
        settlingHeight={100}
      >
        {selectedExpert && (
          <>
            <Group>
              <SimpleCell
                multiline
                before={<Avatar size={72} src={selectedExpert.photo_url} />}
              >
                <InfoRow header="Имя">
                  {selectedExpert.first_name} {selectedExpert.last_name}
                </InfoRow>
              </SimpleCell>
              <SimpleCell multiline>
                <InfoRow header="Регион">{selectedExpert.region}</InfoRow>
              </SimpleCell>
              <SimpleCell multiline>
                <InfoRow header="Регалии">{selectedExpert.regalia}</InfoRow>
              </SimpleCell>
              <Div>
                <InfoRow header="Темы">
                  <Text>{selectedExpert.topics.join(", ")}</Text>
                </InfoRow>
              </Div>
              <SimpleCell
                multiline
                href={selectedExpert.social_link}
                target="_blank"
                subtitle={selectedExpert.social_link}
              >
                <InfoRow header="Соц. сеть">Перейти</InfoRow>
              </SimpleCell>
              <SimpleCell
                multiline
                href={selectedExpert.performance_link}
                target="_blank"
                subtitle={selectedExpert.performance_link}
              >
                <InfoRow header="Выступление">Посмотреть</InfoRow>
              </SimpleCell>
            </Group>
            <Div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="l"
                stretched
                mode="primary"
                onClick={() =>
                  handleExpertAction(selectedExpert.vk_id, "approve")
                }
              >
                Одобрить
              </Button>
              <Button
                size="l"
                stretched
                appearance="negative"
                onClick={() =>
                  handleExpertAction(selectedExpert.vk_id, "reject")
                }
              >
                Отклонить
              </Button>
            </Div>
          </>
        )}
      </ModalPage>
      <ModalPage
        id="event-details"
        onClose={closeModal}
        header={
          <ModalPageHeader
            before={<PanelHeaderBack onClick={closeModal} />}
            after={
              <PanelHeaderButton onClick={closeModal}>
                <Icon24Cancel />
              </PanelHeaderButton>
            }
          >
            Заявка на мероприятие
          </ModalPageHeader>
        }
        settlingHeight={100}
      >
        {selectedEvent && (
          <>
            <Group>
              <SimpleCell multiline>
                <InfoRow header="Название">{selectedEvent.name}</InfoRow>
              </SimpleCell>
              {selectedEvent.description && (
                <SimpleCell multiline>
                  <InfoRow header="Описание">
                    {selectedEvent.description}
                  </InfoRow>
                </SimpleCell>
              )}
              <SimpleCell multiline>
                <InfoRow header="Промо-слово">
                  {selectedEvent.promo_word}
                </InfoRow>
              </SimpleCell>
              <SimpleCell multiline>
                <InfoRow header="ID эксперта">
                  {selectedEvent.expert_id}
                </InfoRow>
              </SimpleCell>
              <SimpleCell multiline>
                <InfoRow header="Длительность">
                  {selectedEvent.duration_minutes} мин.
                </InfoRow>
              </SimpleCell>
              <SimpleCell multiline>
                <InfoRow header="Дата начала">
                  {new Date(selectedEvent.event_date).toLocaleString("ru-RU")}
                </InfoRow>
              </SimpleCell>
              <SimpleCell
                multiline
                href={selectedEvent.event_link}
                target="_blank"
                disabled={!selectedEvent.event_link}
              >
                <InfoRow header="Ссылка на трансляцию">
                  {selectedEvent.event_link ? "Перейти" : "Не указана"}
                </InfoRow>
              </SimpleCell>
            </Group>
            <Div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="l"
                stretched
                mode="primary"
                onClick={() => handleEventAction(selectedEvent.id, "approve")}
              >
                Одобрить
              </Button>
              <Button
                size="l"
                stretched
                appearance="negative"
                onClick={() => handleEventAction(selectedEvent.id, "reject")}
              >
                Отклонить
              </Button>
            </Div>
          </>
        )}
      </ModalPage>
      <ModalPage
        id="mailing-details"
        onClose={closeModal}
        header={<ModalPageHeader>Проверка рассылки</ModalPageHeader>}
        settlingHeight={100}
      >
        {selectedMailing && (
          <>
            <Group>
              <Cell multiline subtitle="Текст сообщения">
                <Text>{selectedMailing.message}</Text>
              </Cell>
              <Cell subtitle="ID эксперта">{selectedMailing.expert_vk_id}</Cell>
            </Group>
            <Div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="l"
                stretched
                mode="primary"
                onClick={() =>
                  handleMailingAction(selectedMailing.id, "approve")
                }
              >
                Одобрить и отправить
              </Button>
              <Button
                size="l"
                stretched
                appearance="negative"
                onClick={() =>
                  handleMailingAction(selectedMailing.id, "reject")
                }
              >
                Отклонить
              </Button>
            </Div>
          </>
        )}
      </ModalPage>
      <PromoCodeEditModal
        id="promo-edit-modal"
        promoCode={selectedPromoCode}
        onClose={() => setActiveModal(null)}
        onSave={handleSavePromoCode}
        onDelete={handleDeletePromoCode}
      />
      <PromoCodeDetailsModal
        id="promo-details-modal"
        promoCode={selectedPromoCode}
        onClose={() => setActiveModal(null)}
      />
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      {modal}
      {activeSheet}
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Панель Администратора
      </PanelHeader>
      <HorizontalScroll>
        <Tabs>
          <TabsItem
            selected={selectedTab === "moderation"}
            onClick={() => setSelectedTab("moderation")}
            id="tab-moderation"
          >
            Заявки
          </TabsItem>
          <TabsItem
            selected={selectedTab === "updates"}
            onClick={() => setSelectedTab("updates")}
            id="tab-updates"
          >
            Обновления
          </TabsItem>
          {/*<TabsItem*/}
          {/*  selected={selectedTab === "mailings"}*/}
          {/*  onClick={() => setSelectedTab("mailings")}*/}
          {/*  id="tab-mailings"*/}
          {/*>*/}
          {/*  Рассылки*/}
          {/*</TabsItem>*/}
          <TabsItem
            selected={selectedTab === "users"}
            onClick={() => setSelectedTab("users")}
            id="tab-users"
          >
            Пользователи
          </TabsItem>
          {/*<TabsItem*/}
          {/*  selected={selectedTab === "promo"}*/}
          {/*  onClick={() => setSelectedTab("promo")}*/}
          {/*  id="tab-promo"*/}
          {/*>*/}
          {/*  Промокоды*/}
          {/*</TabsItem>*/}
        </Tabs>
      </HorizontalScroll>

      <div
        style={{
          display: selectedTab === "moderation" ? "block" : "none",
          paddingBottom: 60,
        }}
      >
        <Group header={<Header>Заявки на регистрацию экспертов</Header>}>
          {loadingModeration ? (
            <Spinner size="l" style={{ margin: "20px 0" }} />
          ) : expertRequests.length === 0 ? (
            <Placeholder title="Новых заявок нет" />
          ) : (
            expertRequests.map((req) => (
              <RequestCard
                key={req.vk_id}
                request={req}
                type="expert"
                onClick={() => openExpertRequest(req)}
              />
            ))
          )}
        </Group>
        <Group header={<Header>Заявки на создание мероприятий</Header>}>
          {loadingModeration ? (
            <Spinner size="l" style={{ margin: "20px 0" }} />
          ) : eventRequests.length === 0 ? (
            <Placeholder title="Новых заявок нет" />
          ) : (
            eventRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                type="event"
                onClick={() => openEventRequest(req)}
              />
            ))
          )}
        </Group>
      </div>

      <div
        style={{
          display: selectedTab === "updates" ? "block" : "none",
          paddingBottom: 60,
        }}
      >
        <Group header={<Header>Заявки на обновление профиля</Header>}>
          {loadingUpdates ? (
            <Spinner size="l" style={{ margin: "20px 0" }} />
          ) : updateRequests.length === 0 ? (
            <Placeholder
              icon={<Icon56UsersOutline />}
              title="Нет заявок на обновление"
            />
          ) : (
            updateRequests.map((req) => (
              <Group
                key={req.id}
                mode="card"
                header={
                  <Header
                    subtitle={`ID эксперта: ${req.expert_vk_id} | ${new Date(req.created_at).toLocaleDateString()}`}
                  >
                    {req.expert_info?.first_name} {req.expert_info?.last_name}
                  </Header>
                }
              >
                {/* Сравнение РЕГИОНА */}
                {req.new_data.region &&
                  req.new_data.region !== req.expert_info?.region && (
                    <SimpleCell multiline disabled>
                      <InfoRow header="Регион (Было)">
                        <Text
                          style={{
                            color: "var(--vkui--color_text_secondary)",
                            textDecoration: "line-through",
                          }}
                        >
                          {req.expert_info?.region || "Не указан"}
                        </Text>
                      </InfoRow>
                      <Div style={{ padding: "8px 0 0 0" }}>
                        <InfoRow header="Регион (Стало)">
                          <Text
                            style={{
                              color: "var(--vkui--color_text_positive)",
                              fontWeight: "500",
                            }}
                          >
                            {req.new_data.region}
                          </Text>
                        </InfoRow>
                      </Div>
                    </SimpleCell>
                  )}

                {req.new_data.social_link &&
                  req.new_data.social_link !== req.expert_info?.social_link && (
                    <SimpleCell multiline disabled>
                      <InfoRow header="Соц. сеть (Было)">
                        <Text
                          style={{ color: "var(--vkui--color_text_secondary)" }}
                        >
                          {req.expert_info?.social_link || "Не указана"}
                        </Text>
                      </InfoRow>
                      <Div style={{ padding: "8px 0 0 0" }}>
                        <InfoRow header="Соц. сеть (Стало)">
                          <Text
                            style={{ color: "var(--vkui--color_text_primary)" }}
                          >
                            {req.new_data.social_link}
                          </Text>
                        </InfoRow>
                      </Div>
                    </SimpleCell>
                  )}

                {req.new_data.regalia &&
                  req.new_data.regalia !== req.expert_info?.regalia && (
                    <Div>
                      <InfoRow header="Регалии (Было)">
                        <Text
                          style={{
                            color: "var(--vkui--color_text_secondary)",
                            fontSize: "14px",
                          }}
                        >
                          {req.expert_info?.regalia || "Пусто"}
                        </Text>
                      </InfoRow>
                      <Separator style={{ margin: "10px 0" }} />
                      <InfoRow header="Регалии (Стало)">
                        <Text
                          style={{
                            color: "var(--vkui--color_text_primary)",
                            fontSize: "15px",
                          }}
                        >
                          {req.new_data.regalia}
                        </Text>
                      </InfoRow>
                    </Div>
                  )}

                {req.new_data.performance_link &&
                  req.new_data.performance_link !==
                  req.expert_info?.performance_link && (
                    <SimpleCell multiline disabled>
                      <InfoRow header="Пример выступления (Было)">
                        <Text
                          style={{ color: "var(--vkui--color_text_secondary)" }}
                        >
                          {req.expert_info?.performance_link || "Нет"}
                        </Text>
                      </InfoRow>
                      <Div style={{ padding: "8px 0 0 0" }}>
                        <InfoRow header="Пример выступления (Стало)">
                          <Text
                            style={{ color: "var(--vkui--color_text_primary)" }}
                          >
                            {req.new_data.performance_link}
                          </Text>
                        </InfoRow>
                      </Div>
                    </SimpleCell>
                  )}

                <Div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <Button
                    size="l"
                    stretched
                    mode="primary"
                    onClick={() => handleUpdateAction(req.id, "approve")}
                  >
                    Принять изменения
                  </Button>
                  <Button
                    size="l"
                    stretched
                    appearance="negative"
                    onClick={() => handleUpdateAction(req.id, "reject")}
                  >
                    Отклонить
                  </Button>
                </Div>
              </Group>
            ))
          )}
        </Group>
      </div>

      {/*<div*/}
      {/*  style={{*/}
      {/*    display: selectedTab === "mailings" ? "block" : "none",*/}
      {/*    paddingBottom: 60,*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <Group header={<Header>Рассылки на модерацию</Header>}>*/}
      {/*    {loadingMailings ? (*/}
      {/*      <Spinner size="l" style={{ margin: "20px 0" }} />*/}
      {/*    ) : mailingRequests.length === 0 ? (*/}
      {/*      <Placeholder title="Новых рассылок нет" />*/}
      {/*    ) : (*/}
      {/*      mailingRequests.map((req) => (*/}
      {/*        <SimpleCell*/}
      {/*          key={req.id}*/}
      {/*          multiline*/}
      {/*          onClick={() => {*/}
      {/*            setSelectedMailing(req);*/}
      {/*            setActiveModal("mailing-details");*/}
      {/*          }}*/}
      {/*          subtitle={`От эксперта ID: ${req.expert_vk_id}`}*/}
      {/*        >*/}
      {/*          {req.message.slice(0, 100)}...*/}
      {/*        </SimpleCell>*/}
      {/*      ))*/}
      {/*    )}*/}
      {/*  </Group>*/}
      {/*</div>*/}

      <div
        style={{
          display: selectedTab === "users" ? "block" : "none",
          paddingBottom: 60,
        }}
      >
        <Group>
          <Search
            value={usersSearch}
            onChange={(e) => setUsersSearch(e.target.value)}
            placeholder="Поиск по имени, фамилии или ID"
          />
          <FormLayoutGroup mode="horizontal">
            <FormItem top="Тип пользователя">
              <Select
                value={usersFilter.type}
                onChange={(e) =>
                  setUsersFilter((prev) => ({ ...prev, type: e.target.value }))
                }
                options={[
                  { label: "Все", value: "all" },
                  {
                    label: "Только эксперты",
                    value: "expert",
                  },
                  { label: "Только пользователи", value: "user" },
                ]}
              />
            </FormItem>
            <FormItem top="Сортировка по дате">
              <Select
                value={usersFilter.date}
                onChange={(e) =>
                  setUsersFilter((prev) => ({ ...prev, date: e.target.value }))
                }
                options={[
                  { label: "Сначала новые", value: "desc" },
                  {
                    label: "Сначала старые",
                    value: "asc",
                  },
                ]}
              />
            </FormItem>
          </FormLayoutGroup>
        </Group>
        <Group header={<Header>Список пользователей</Header>}>
          {users.map((user) => (
            <SimpleCell
              key={user.vk_id}
              before={<Avatar size={48} src={user.photo_url} />}
              after={
                <IconButton
                  onClick={(e) => openUserMenu(e, user)}
                  aria-label="Действия с пользователем"
                >
                  <Icon28MoreVertical />
                </IconButton>
              }
              subtitle={
                user.is_expert
                  ? `Эксперт (статус: ${user.status || "approved"})`
                  : "Пользователь"
              }
            >
              {user.first_name} {user.last_name}
            </SimpleCell>
          ))}
          <div ref={usersObserverRef} style={{ height: "1px" }} />
          {loadingUsers && <Spinner size="l" style={{ margin: "20px 0" }} />}
          {!loadingUsers && users.length === 0 && (
            <Placeholder
              icon={<Icon56UsersOutline />}
              title="Пользователи не найдены"
            />
          )}
        </Group>
      </div>

      {/*<div*/}
      {/*  style={{*/}
      {/*    display: selectedTab === "promo" ? "block" : "none",*/}
      {/*    paddingBottom: 60,*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <Group>*/}
      {/*    <Div>*/}
      {/*      <Button*/}
      {/*        stretched*/}
      {/*        size="l"*/}
      {/*        mode="secondary"*/}
      {/*        onClick={() => openPromoCodeModal(null)}*/}
      {/*      >*/}
      {/*        Создать промокод*/}
      {/*      </Button>*/}
      {/*    </Div>*/}
      {/*  </Group>*/}
      {/*  <Group header={<Header>Список промокодов</Header>}>*/}
      {/*    {promoCodes.map((promo) => (*/}
      {/*      <PromoCodeCard*/}
      {/*        key={promo.id}*/}
      {/*        promoCode={promo}*/}
      {/*        onMenuClick={openPromoMenu}*/}
      {/*      />*/}
      {/*    ))}*/}
      {/*    <div ref={promoObserverRef} style={{ height: "1px" }} />*/}
      {/*    {loadingPromoCodes && (*/}
      {/*      <Spinner size="l" style={{ margin: "20px 0" }} />*/}
      {/*    )}*/}
      {/*    {!loadingPromoCodes && promoCodes.length === 0 && (*/}
      {/*      <Placeholder title="Промокоды не найдены" />*/}
      {/*    )}*/}
      {/*  </Group>*/}
      {/*</div>*/}
    </Panel>
  );
};
