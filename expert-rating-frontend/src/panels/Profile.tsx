import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  ModalRoot,
  Search,
  Placeholder,
  Spinner,
  Alert,
  Header,
  Snackbar,
  PullToRefresh,
  Button,
  Div,
  Text,
  ModalPage,
  ModalPageHeader,
  SimpleCell,
  Switch,
} from "@vkontakte/vkui";
import {
  Icon56UsersOutline,
  Icon16Cancel,
  Icon16Done,
  Icon28RefreshOutline,
  Icon28SettingsOutline,
} from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import { UserProfile } from "../components/UserProfile";
import { VoteHistoryCard } from "../components/VoteHistoryCard";
import { EventInfoCard } from "../components/EventInfoCard";
import { EventActionModal } from "../components/EventActionModal";
import { QrCodeModal } from "../components/QrCodeModal";
import { groupPlannedEvents } from "../utils/groupEventsByDate";
import { useApi } from "../hooks/useApi";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { EventData, UserData } from "../types";

const GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID);

interface ProfileProps {
  id: string;
  user: UserData | null;
  setCurrentUser: (user: UserData | null) => void;
  refetchUser: () => void;
  setPopout: (popout: React.ReactNode | null) => void;
  setSnackbar: (snackbar: React.ReactNode | null) => void;
}

export const Profile = ({
  id,
  user,
  setCurrentUser,
  refetchUser,
  setPopout,
  setSnackbar,
}: ProfileProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiDelete, apiPost, apiPut } = useApi();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isFetching, setFetching] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"votes" | "events">("votes");
  const [votes, setVotes] = useState<any[]>([]);
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [searchQueryVotes, setSearchQueryVotes] = useState("");
  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const fetchVotes = useCallback(async () => {
    setIsLoadingVotes(true);
    try {
      const data = await apiGet("/users/me/votes");
      setVotes(data || []);
    } catch (e) {
      console.error("Failed to load user votes", e);
    } finally {
      setIsLoadingVotes(false);
    }
  }, [apiGet]);
  const fetchMyEvents = useCallback(async () => {
    if (!user?.is_expert) {
      setIsLoadingMyEvents(false);
      return;
    }
    setIsLoadingMyEvents(true);
    try {
      const data = await apiGet("/events/my");
      setMyEvents(data || []);
    } catch (e) {
      console.error("Failed to load my events", e);
    } finally {
      setIsLoadingMyEvents(false);
    }
  }, [apiGet, user?.is_expert]);
  useEffect(() => {
    if (!user?.is_expert) {
      fetchVotes();
      return;
    }
    if (activeTab === "votes") fetchVotes();
    if (activeTab === "events") fetchMyEvents();
  }, [activeTab, user?.is_expert, fetchVotes, fetchMyEvents]);

  const onRefresh = useCallback(async () => {
    setFetching(true);
    await Promise.all(
      [refetchUser(), fetchVotes(), user?.is_expert && fetchMyEvents()].filter(
        Boolean,
      ),
    );
    setFetching(false);
  }, [refetchUser, fetchVotes, fetchMyEvents, user?.is_expert]);
  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("event-actions-modal");
  };

  const handleShare = () => {
    if (!selectedEvent) return;
    const link = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}#/vote/${selectedEvent.promo_word}`;
    bridge.send("VKWebAppShare", { link });
    setActiveModal(null);
  };
  const performDeleteEvent = async () => {
    if (!selectedEvent) return;
    setPopout(<Spinner size="l" />);
    try {
      await apiDelete(`/events/${selectedEvent.id}`);
      setMyEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
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
    setPopout(<Spinner size="l" />);
    try {
      const updatedEvent = await apiPost(
        `/events/${selectedEvent.id}/stop`,
        {},
      );
      setMyEvents((prev) =>
        prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
      );
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
    const payload = { [fieldName]: value };
    if (fieldName === "allow_notifications" && !value) {
      payload.allow_expert_mailings = false;
    }
    try {
      await apiPut("/users/me/settings", payload);
      await refetchUser();
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
      await refetchUser();
    }
  };

  const handleNotificationSettingsChange = async (
    fieldName: "allow_notifications" | "allow_expert_mailings",
    value: boolean,
  ) => {
    if (!user) return;
    setCurrentUser({ ...user, [fieldName]: value });
    if (fieldName === "allow_notifications" && !value) {
      setCurrentUser({
        ...user,
        allow_notifications: false,
        allow_expert_mailings: false,
      });
    }

    if (fieldName === "allow_notifications" && value === true) {
      // Если мы не в браузере для разработки, а внутри VK
      if (bridge.isWebView()) {
        try {
          // Сразу пытаемся запросить разрешение. Если оно уже есть, метод вернет { result: true }
          const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
            group_id: GROUP_ID,
          });
          if (result.result) {
            // Права есть или были успешно получены
            await handleSettingsChange(fieldName, value);
          } else {
            // Пользователь отказался давать права
            await refetchUser(); // Откатываем UI
          }
        } catch (error) {
          // Произошла ошибка VK Bridge (например, на платформе, где это не поддерживается)
          await refetchUser(); // Откатываем UI
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
        // Если мы в браузере, просто сохраняем настройку для отладки
        console.log(
          "DEV BROWSER: Skipping VK Bridge call, saving settings directly.",
        );
        await handleSettingsChange(fieldName, value);
      }
    } else {
      // Для всех остальных случаев (выключение allow_notifications или изменение allow_expert_mailings)
      await handleSettingsChange(fieldName, value);
    }
  };

  const handleCancelVote = (voteId: number, isExpertVote: boolean) => {
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Подтвердить",
            mode: "destructive",
            action: () => performCancelVote(voteId, isExpertVote),
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите отменить свой голос?"
      />,
    );
  };
  const performCancelVote = async (voteId: number, isExpertVote: boolean) => {
    const endpoint = isExpertVote
      ? `/events/vote/${voteId}/cancel`
      : `/experts/vote/${voteId}/cancel`;
    setPopout(<Spinner size="l" />);
    try {
      await apiDelete(endpoint);
      setVotes((prev) => prev.filter((vote) => vote.id !== voteId));
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Голос отменен
        </Snackbar>,
      );
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Ошибка
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };
  const filteredVotes = useMemo(() => {
    const query = searchQueryVotes.toLowerCase().trim();
    if (!query) return votes;
    return votes.filter((vote) => {
      const target = vote.is_expert_vote
        ? vote.event?.expert_info
        : vote.expert;
      const eventName = vote.event?.name || "";
      const expertName = `${target?.first_name || ""} ${target?.last_name || ""}`;
      return (
        eventName.toLowerCase().includes(query) ||
        expertName.toLowerCase().includes(query)
      );
    });
  }, [searchQueryVotes, votes]);
  const { planned, archived } = useMemo(() => {
    const p: EventData[] = [],
      a: EventData[] = [];
    const nowTimestamp = new Date().getTime();
    myEvents.forEach((event) => {
      const isoDateString = event.event_date.endsWith("Z")
        ? event.event_date
        : event.event_date + "Z";
      const eventEndTimestamp =
        new Date(isoDateString).getTime() + event.duration_minutes * 60000;
      if (eventEndTimestamp < nowTimestamp) a.push(event);
      else p.push(event);
    });
    a.sort(
      (evA, evB) =>
        new Date(evB.event_date).getTime() - new Date(evA.event_date).getTime(),
    );
    return { planned: p, archived: a };
  }, [myEvents]);
  const groupedPlannedEvents = groupPlannedEvents(planned);
  const renderGroupedEvents = (group: EventData[], title: string) =>
    group.length > 0 && (
      <React.Fragment key={title}>
        <Header>{title}</Header>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.map((event) => (
            <EventInfoCard
              key={event.id}
              event={event}
              onClick={handleEventClick}
            />
          ))}
        </div>
      </React.Fragment>
    );
  const renderVotesContent = () => (
    <Group>
      <Search
        value={searchQueryVotes}
        onChange={(e) => setSearchQueryVotes(e.target.value)}
        placeholder="Поиск по имени или мероприятию"
      />
      {isLoadingVotes ? (
        <Spinner size="l" />
      ) : filteredVotes.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "0 8px 8px 8px",
          }}
        >
          {filteredVotes.map((vote) => (
            <VoteHistoryCard
              key={vote.id}
              vote={vote}
              onCancelVote={handleCancelVote}
            />
          ))}
        </div>
      ) : (
        <Placeholder
          icon={<Icon56UsersOutline />}
          title="Вы еще не голосовали."
        />
      )}
    </Group>
  );
  const renderEventsContent = () => (
    <div style={{ paddingBottom: "60px" }}>
      <Group>
        <Header indicator={`${planned.length}`}>Запланированные</Header>
        <Div>
          <Button
            stretched
            size="l"
            mode="secondary"
            onClick={() => routeNavigator.push("/create-event")}
          >
            + Добавить Мероприятие
          </Button>
        </Div>
        {isLoadingMyEvents ? (
          <Spinner size="l" />
        ) : planned.length === 0 ? (
          <Placeholder title="Нет запланированных мероприятий." />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {renderGroupedEvents(groupedPlannedEvents.today, "Сегодня")}
            {renderGroupedEvents(groupedPlannedEvents.tomorrow, "Завтра")}
            {renderGroupedEvents(
              groupedPlannedEvents.next7Days,
              "Ближайшие 7 дней",
            )}
            {renderGroupedEvents(groupedPlannedEvents.later, "Позже")}
          </div>
        )}
      </Group>
      {archived.length > 0 && (
        <Group>
          <Header>Архив</Header>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {archived.map((event) => (
              <EventInfoCard
                key={event.id}
                event={event}
                onClick={handleEventClick}
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
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
      <ModalPage
        id="profile-settings-modal"
        onClose={() => setActiveModal(null)}
        header={<ModalPageHeader>Настройки</ModalPageHeader>}
        settlingHeight={100}
      >
        {user?.is_expert && (
          <Group header={<Header>Рейтинг</Header>}>
            <SimpleCell
              Component="label"
              after={
                <Switch
                  checked={user?.show_community_rating ?? true}
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
                checked={user?.allow_notifications ?? false}
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
            disabled={!user?.allow_notifications}
            after={
              <Switch
                name="allow_expert_mailings"
                checked={user?.allow_expert_mailings ?? false}
                onChange={(e) =>
                  handleNotificationSettingsChange(
                    "allow_expert_mailings",
                    e.target.checked,
                  )
                }
              />
            }
          >
            Сообщения от экспертов
          </SimpleCell>
        </Group>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader>Аккаунт</PanelHeader>
      <PullToRefresh onRefresh={onRefresh} isFetching={isFetching}>
        <UserProfile
          user={user}
          onSettingsClick={() => setActiveModal("profile-settings-modal")}
          onWithdraw={() => {}}
          isWithdrawLoading={isWithdrawLoading}
          isExpert={user?.is_expert || false}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {user?.is_expert ? (
          <>
            {activeTab === "votes" && renderVotesContent()}
            {activeTab === "events" && renderEventsContent()}
          </>
        ) : (
          <Group>
            <Header>Мои голоса</Header>
            {renderVotesContent()}
          </Group>
        )}
      </PullToRefresh>
    </Panel>
  );
};
