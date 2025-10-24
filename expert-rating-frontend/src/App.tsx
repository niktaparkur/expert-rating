// expert-rating-frontend/src/App.tsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  Epic,
  Tabbar,
  TabbarItem,
  SplitLayout,
  SplitCol,
  View,
  AppRoot,
  ModalRoot,
  ModalCard,
  FormItem,
  FormField,
  Input,
  Button,
  ScreenSpinner,
  Spinner,
  ModalPage,
  ModalPageHeader,
  Group,
  Header,
  Checkbox,
  Search,
  Div,
  PanelHeaderBack,
  Text,
  Snackbar,
  Alert,
  SimpleCell,
  Switch,
} from "@vkontakte/vkui";
import {
  useActiveVkuiLocation,
  useRouteNavigator,
  useSearchParams,
} from "@vkontakte/vk-mini-apps-router";
import {
  Icon28ArticleOutline,
  Icon28CompassOutline,
  Icon28MoneyCircleOutline,
  Icon28UserCircleOutline,
  Icon24CheckCircleFilledBlue,
  Icon28CheckShieldOutline,
  Icon16Done,
  Icon16Cancel,
} from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import debounce from "lodash.debounce";
import { useQueryClient } from "@tanstack/react-query";

import { Onboarding } from "./components/Shared/Onboarding";
import { CreateMailingModal } from "./components/CreateMailingModal";
import { EventActionModal } from "./components/Event/EventActionModal";
import { QrCodeModal } from "./components/Event/QrCodeModal";
import { useApi } from "./hooks/useApi";
import { useUserStore } from "./store/userStore";
import { useUiStore } from "./store/uiStore";

import {
  Home,
  Registration,
  Admin,
  Afisha,
  CreateEvent,
  Voting,
  ExpertProfile,
  Tariffs,
  Profile,
} from "./panels";
import {
  VIEW_MAIN,
  VIEW_AFISHA,
  VIEW_TARIFFS,
  VIEW_PROFILE,
  PANEL_HOME,
  PANEL_REGISTRATION,
  PANEL_AFISHA,
  PANEL_ADMIN,
  PANEL_VOTING,
  PANEL_EXPERT_PROFILE,
  PANEL_TARIFFS,
  PANEL_PROFILE,
} from "./routes";
import { EventData, UserData } from "./types";

const PopoutWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
      }}
    >
      {children}
    </div>
  );
};

const GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID);
const TARIFF_MAILING_LIMITS: { [key: string]: number } = {
  Начальный: 1,
  Стандарт: 2,
  Профи: 4,
};

export const App = () => {
  const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } =
    useActiveVkuiLocation();
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiPost, apiPut, apiDelete } = useApi();
  const [searchParams] = useSearchParams();
  const hasLaunchParams = searchParams.toString().length > 0;
  const queryClient = useQueryClient();

  const { currentUser, setCurrentUser } = useUserStore();
  const {
    activeModal,
    popout,
    snackbar,
    setActiveModal,
    setPopout,
    setSnackbar,
  } = useUiStore();

  const [promoWord, setPromoWord] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [promoStatus, setPromoStatus] = useState<any | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([]);

  // --- ЛОГИКА, ПОДНЯТАЯ ИЗ PROFILE.TSX ---
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [mailingsUsed, setMailingsUsed] = useState(0); // TODO: fetch this from user data

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("event-actions-modal");
  };

  const handleShare = () => {
    if (!selectedEvent) return;
    const link = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}#/vote/${
      selectedEvent.promo_word
    }`;
    bridge.send("VKWebAppShare", { link }).catch((e) => {
      if (e.error_data?.error_code !== 4) {
        // Не показываем ошибку, если пользователь просто закрыл окно
        console.error(e);
      }
    });
    setActiveModal(null);
  };

  const performDeleteEvent = async () => {
    if (!selectedEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(`/events/${selectedEvent.id}`);
      await queryClient.invalidateQueries({
        queryKey: ["myEvents", currentUser?.vk_id],
      });
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Мероприятие удалено.
        </Snackbar>,
      );
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const handleDeleteEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Удалить",
            mode: "destructive",
            action: performDeleteEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите удалить это мероприятие? Действие необратимо."
      />,
    );
  };

  const performStopEvent = async () => {
    if (!selectedEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/events/${selectedEvent.id}/stop`, {});
      await queryClient.invalidateQueries({
        queryKey: ["myEvents", currentUser?.vk_id],
      });
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Прием голосов остановлен.
        </Snackbar>,
      );
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const handleStopEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Остановить",
            mode: "destructive",
            action: performStopEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите остановить прием голосов? После этого запустить его снова будет невозможно."
      />,
    );
  };

  const handleShowQr = () => setActiveModal("qr-code-modal");

  const handleSettingsChange = async (fieldName: string, value: boolean) => {
    if (!currentUser) return;
    setPopout(<Spinner size="xl" />);
    const payload = { [fieldName]: value };
    if (fieldName === "allow_notifications" && !value) {
      payload.allow_expert_mailings = false;
    }
    try {
      const updatedUser = await apiPut<UserData>("/users/me/settings", payload);
      setCurrentUser(updatedUser);
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    } finally {
      setPopout(null);
    }
  };

  const handleNotificationSettingsChange = async (
    fieldName: "allow_notifications" | "allow_expert_mailings",
    value: boolean,
  ) => {
    if (fieldName === "allow_notifications" && value === true) {
      if (bridge.isWebView()) {
        try {
          const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
            group_id: GROUP_ID,
          });
          if (result.result) {
            await handleSettingsChange(fieldName, value);
          }
        } catch (error) {
          setSnackbar(
            <Snackbar
              onClose={() => setSnackbar(null)}
              before={<Icon16Cancel />}
            >
              Не удалось запросить разрешение на уведомления.
            </Snackbar>,
          );
        }
      } else {
        await handleSettingsChange(fieldName, value);
      }
    } else {
      await handleSettingsChange(fieldName, value);
    }
  };
  // --- КОНЕЦ ЛОГИКИ ИЗ PROFILE.TSX ---

  const refetchUser = useCallback(async () => {
    try {
      const userData = await apiGet<UserData>("/users/me");
      setCurrentUser(userData);
    } catch (error) {
      console.error("Failed to refetch user:", error);
    }
  }, [apiGet, setCurrentUser]);

  useEffect(() => {
    apiGet<any[]>("/meta/themes")
      .then(setAllThemes)
      .catch((e) => console.error("Failed to load themes", e));
  }, [apiGet]);

  const handleTopicChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    themeId: number,
  ) => {
    const { checked } = e.target;
    if (checked) {
      if (selectedThemeIds.length < 3) {
        setSelectedThemeIds([...selectedThemeIds, themeId]);
      }
    } else {
      setSelectedThemeIds(selectedThemeIds.filter((id) => id !== themeId));
    }
  };

  const isTopicSelectionValid =
    selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

  const filteredTopics = useMemo(() => {
    if (!allThemes) return [];
    if (!searchQuery) return allThemes;
    const lowerQuery = searchQuery.toLowerCase();
    return allThemes
      .map((group) => ({
        ...group,
        items: group.items.filter((item: any) =>
          item.name.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery, allThemes]);

  const checkPromo = useCallback(
    debounce(async (word: string) => {
      const normalizedWord = word.trim().toUpperCase();
      if (!normalizedWord || !/^[A-Z0-9А-ЯЁ]{4,}$/i.test(normalizedWord)) {
        setPromoStatus(null);
        setIsCheckingPromo(false);
        return;
      }
      setIsCheckingPromo(true);
      try {
        const response = await apiGet(`/events/status/${normalizedWord}`);
        setPromoStatus(response);
      } catch (error) {
        console.error("Promo check failed:", error);
        setPromoStatus({ status: "error" });
      } finally {
        setIsCheckingPromo(false);
      }
    }, 500),
    [apiGet],
  );

  useEffect(() => {
    if (activeModal === "promo-vote-modal") {
      checkPromo(promoWord);
    }
  }, [promoWord, checkPromo, activeModal]);

  const handlePromoWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPromoWord(e.target.value);
  };

  const getPromoBottomText = () => {
    if (isCheckingPromo)
      return <Spinner size="s" style={{ alignSelf: "center" }} />;
    if (!promoStatus) return null;
    switch (promoStatus.status) {
      case "active":
        return (
          <span style={{ color: "var(--vkui--color_text_positive)" }}>
            Мероприятие найдено и активно!
          </span>
        );
      case "not_started":
        const startTime = new Date(promoStatus.start_time).toLocaleString(
          "ru-RU",
          {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          },
        );
        return `Голосование еще не началось. Начало: ${startTime}`;
      case "finished":
        return "Голосование по этому слову уже завершилось.";
      case "not_found":
        return (
          <span style={{ color: "var(--vkui--color_text_negative)" }}>
            Мероприятие с таким словом не найдено.
          </span>
        );
      case "error":
        return (
          <span style={{ color: "var(--vkui--color_text_negative)" }}>
            Ошибка проверки. Попробуйте еще раз.
          </span>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleAppEvents = (e: any) => {
      if (e.detail.type === "VKWebAppViewRestore") {
        refetchUser();
      }
    };
    bridge.subscribe(handleAppEvents);
    return () => bridge.unsubscribe(handleAppEvents);
  }, [refetchUser]);

  useEffect(() => {
    const initApp = async () => {
      let onboardingNeeded = true;
      if (!hasLaunchParams) {
        try {
          const result = await bridge.send("VKWebAppStorageGet", {
            keys: ["onboardingFinished"],
          });
          const onboardingFinished =
            result.keys.find((k) => k.key === "onboardingFinished")?.value ===
            "true";
          if (onboardingFinished) onboardingNeeded = false;
        } catch (e) {
          console.warn(
            "VK Storage check failed, falling back to localStorage",
            e,
          );
          if (localStorage.getItem("onboardingFinished"))
            onboardingNeeded = false;
        }
      } else {
        onboardingNeeded = false;
      }

      if (onboardingNeeded) {
        setShowOnboarding(true);
        setIsLoadingApp(false);
        return;
      }

      try {
        const userData = await apiGet<UserData>("/users/me");
        if (userData) {
          setCurrentUser(userData);
        } else {
          const vkUser = await bridge.send("VKWebAppGetUserInfo");
          const newUserPayload = {
            vk_id: vkUser.id,
            first_name: vkUser.first_name,
            last_name: vkUser.last_name,
            photo_url: vkUser.photo_200,
          };
          const registeredUser = await apiPost<UserData>(
            "/users/register",
            newUserPayload,
          );
          setCurrentUser(registeredUser);
        }
      } catch (error) {
        console.error(
          "Fatal: A critical error occurred during initialization:",
          error,
        );
      } finally {
        setIsLoadingApp(false);
      }
    };
    initApp();
  }, [apiGet, apiPost, hasLaunchParams, setCurrentUser]);

  const finishOnboarding = async () => {
    try {
      await bridge.send("VKWebAppStorageSet", {
        key: "onboardingFinished",
        value: "true",
      });
    } catch (error) {
      localStorage.setItem("onboardingFinished", "true");
    }
    setShowOnboarding(false);
    window.location.reload();
  };

  const onStoryChange = (e: React.MouseEvent<HTMLElement>) => {
    const story = e.currentTarget.dataset.story;
    if (story === VIEW_MAIN) routeNavigator.push("/");
    if (story === VIEW_AFISHA) routeNavigator.push("/afisha");
    if (story === VIEW_TARIFFS) routeNavigator.push("/tariffs");
    if (story === VIEW_PROFILE) routeNavigator.push("/profile");
  };

  const goToVoteByPromo = () => {
    if (promoStatus?.status === "active") {
      setActiveModal(null);
      routeNavigator.push(`/vote/${promoWord.trim().toUpperCase()}`);
    }
  };

  const userTariff = currentUser?.tariff_plan || "Начальный";
  const mailingLimit = TARIFF_MAILING_LIMITS[userTariff] || 1;

  const renderTabbar = () => (
    <Tabbar>
      <TabbarItem
        onClick={onStoryChange}
        selected={activeView === VIEW_MAIN}
        data-story={VIEW_MAIN}
        label="Рейтинг"
      >
        <Icon28ArticleOutline />
      </TabbarItem>
      <TabbarItem
        onClick={onStoryChange}
        selected={activeView === VIEW_AFISHA}
        data-story={VIEW_AFISHA}
        label="Афиша"
      >
        <Icon28CompassOutline />
      </TabbarItem>
      <TabbarItem
        onClick={() => setActiveModal("promo-vote-modal")}
        style={{
          background: "var(--vkui--color_background_accent)",
          borderRadius: "12px",
          color: "white",
        }}
        label={
          <div
            style={{ whiteSpace: "normal", lineHeight: 1.2, fontSize: "10px" }}
          >
            Голосовать
          </div>
        }
      >
        <Icon24CheckCircleFilledBlue />
      </TabbarItem>
      <TabbarItem
        onClick={onStoryChange}
        selected={activeView === VIEW_TARIFFS}
        data-story={VIEW_TARIFFS}
        label="Тарифы"
      >
        <Icon28MoneyCircleOutline />
      </TabbarItem>
      <TabbarItem
        onClick={onStoryChange}
        selected={activeView === VIEW_PROFILE}
        data-story={VIEW_PROFILE}
        label="Аккаунт"
      >
        <Icon28UserCircleOutline />
      </TabbarItem>
      {currentUser?.is_admin && (
        <TabbarItem
          onClick={() => routeNavigator.push("/admin")}
          selected={activePanel === PANEL_ADMIN}
          label="Админка"
        >
          <Icon28CheckShieldOutline />
        </TabbarItem>
      )}
    </Tabbar>
  );

  if (isLoadingApp) return <ScreenSpinner state="loading" />;
  if (showOnboarding) return <Onboarding onFinish={finishOnboarding} />;

  return (
    <AppRoot>
      <SplitLayout>
        <SplitCol>
          <Epic activeStory={activeView} tabbar={renderTabbar()}>
            <View id={VIEW_MAIN} activePanel={activePanel}>
              <Home id={PANEL_HOME} />
              <Registration
                id={PANEL_REGISTRATION}
                selectedThemeIds={selectedThemeIds}
                onOpenTopicsModal={() => setActiveModal("topics-modal")}
              />
              <Voting id={PANEL_VOTING} />
              <ExpertProfile id={PANEL_EXPERT_PROFILE} />
              <Admin id={PANEL_ADMIN} />
            </View>
            <View id={VIEW_AFISHA} activePanel={activePanel}>
              <Afisha id={PANEL_AFISHA} />
            </View>
            <View id={VIEW_TARIFFS} activePanel={activePanel}>
              <Tariffs id={PANEL_TARIFFS} />
            </View>
            <View id={VIEW_PROFILE} activePanel={activePanel}>
              <Profile
                id={PANEL_PROFILE}
                onOpenCreateEventModal={() =>
                  setActiveModal("create-event-modal")
                }
                onEventClick={handleEventClick}
              />
            </View>
          </Epic>
        </SplitCol>
      </SplitLayout>
      {snackbar}
      {popout && <PopoutWrapper>{popout}</PopoutWrapper>}
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalCard
          id="promo-vote-modal"
          onClose={() => setActiveModal(null)}
          title="Голосование"
        >
          <FormItem
            top={<Text>Введите промо-слово или наведите камеру на QR-код</Text>}
            bottom={getPromoBottomText()}
            status={
              promoStatus?.status === "not_found" ||
              promoStatus?.status === "error"
                ? "error"
                : "default"
            }
          >
            <FormField>
              <Input value={promoWord} onChange={handlePromoWordChange} />
            </FormField>
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={goToVoteByPromo}
              disabled={promoStatus?.status !== "active"}
            >
              Проголосовать
            </Button>
          </FormItem>
        </ModalCard>

        <ModalPage
          id="topics-modal"
          onClose={() => setActiveModal(null)}
          header={
            <ModalPageHeader
              before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}
            >
              <div style={{ padding: "0 8px", width: "100%" }}>
                <Search
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по темам"
                />
              </div>
            </ModalPageHeader>
          }
          footer={
            isTopicSelectionValid && (
              <Div>
                <Button size="l" stretched onClick={() => setActiveModal(null)}>
                  Сохранить
                </Button>
              </Div>
            )
          }
          settlingHeight={100}
        >
          <Group>
            {filteredTopics.map((group) => (
              <div key={group.name}>
                <Header>{group.name}</Header>
                {group.items.map((item: any) => (
                  <Checkbox
                    key={item.id}
                    checked={selectedThemeIds.includes(item.id)}
                    onChange={(e) => handleTopicChange(e, item.id)}
                    disabled={
                      selectedThemeIds.length >= 3 &&
                      !selectedThemeIds.includes(item.id)
                    }
                  >
                    {item.name}
                  </Checkbox>
                ))}
              </div>
            ))}
            {filteredTopics.length === 0 && <Div>Ничего не найдено</Div>}
          </Group>
        </ModalPage>

        <CreateEvent
          id="create-event-modal"
          onClose={() => setActiveModal(null)}
          afterCreate={refetchUser}
        />

        <EventActionModal
          id="event-actions-modal"
          event={selectedEvent}
          onClose={() => setActiveModal(null)}
          onShare={handleShare}
          onDelete={handleDeleteEvent}
          onStop={handleStopEvent}
          onShowQr={handleShowQr}
        />
        <QrCodeModal
          id="qr-code-modal"
          event={selectedEvent}
          onClose={() => setActiveModal(null)}
        />
        <CreateMailingModal
          id="create-mailing-modal"
          onClose={() => setActiveModal(null)}
          onSend={async (message: string) => {
            setPopout(<Spinner size="l" />);
            try {
              await apiPost("/mailings/create", { message });
              setActiveModal(null);
              setSnackbar(
                <Snackbar
                  onClose={() => setSnackbar(null)}
                  before={<Icon16Done />}
                >
                  Рассылка отправлена на модерацию!
                </Snackbar>,
              );
              setMailingsUsed((prev) => prev + 1);
            } catch (err: any) {
              setSnackbar(
                <Snackbar
                  onClose={() => setSnackbar(null)}
                  before={<Icon16Cancel />}
                >
                  {err.message || "Ошибка при отправке"}
                </Snackbar>,
              );
            } finally {
              setPopout(null);
            }
          }}
          mailingLimits={{ used: mailingsUsed, limit: mailingLimit }}
        />
        <ModalPage
          id="profile-settings-modal"
          onClose={() => setActiveModal(null)}
          header={
            <ModalPageHeader
              before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}
            >
              Настройки
            </ModalPageHeader>
          }
          settlingHeight={100}
        >
          {currentUser?.is_expert && (
            <Group header={<Header>Рейтинг</Header>}>
              <SimpleCell
                Component="label"
                after={
                  <Switch
                    checked={currentUser?.show_community_rating ?? true}
                    onChange={(e) =>
                      handleSettingsChange(
                        "show_community_rating",
                        e.target.checked,
                      )
                    }
                  />
                }
              >
                Показывать народный рейтинг
              </SimpleCell>
            </Group>
          )}
          <Group header={<Header>Уведомления</Header>}>
            <SimpleCell
              Component="label"
              after={
                <Switch
                  name="allow_notifications"
                  checked={currentUser?.allow_notifications ?? false}
                  onChange={(e) =>
                    handleNotificationSettingsChange(
                      "allow_notifications",
                      e.target.checked,
                    )
                  }
                />
              }
            >
              Получать уведомления
            </SimpleCell>
            <SimpleCell
              Component="label"
              disabled={!currentUser?.allow_notifications}
              after={
                <Switch
                  name="allow_expert_mailings"
                  checked={currentUser?.allow_expert_mailings ?? false}
                  onChange={(e) =>
                    handleNotificationSettingsChange(
                      "allow_expert_mailings",
                      e.target.checked,
                    )
                  }
                  disabled={!currentUser?.allow_notifications}
                />
              }
            >
              Сообщения от экспертов
            </SimpleCell>
          </Group>
        </ModalPage>
      </ModalRoot>
    </AppRoot>
  );
};
