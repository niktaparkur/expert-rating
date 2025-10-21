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
  PanelHeaderButton,
  useAdaptivity,
  ViewWidth,
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

import { UserProfile } from "../components/UserProfile";
import { VoteHistoryCard } from "../components/VoteHistoryCard";
import { EventInfoCard } from "../components/EventInfoCard";
import { EventActionModal } from "../components/EventActionModal";
import { groupPlannedEvents } from "../utils/groupEventsByDate";
import { useApi } from "../hooks/useApi";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { EventData, UserData } from "../types";

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
  const { apiGet, apiDelete, apiPut } = useApi();

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
    if (activeTab === "votes" && votes.length === 0) fetchVotes();
    if (activeTab === "events" && myEvents.length === 0) fetchMyEvents();
  }, [activeTab, user?.is_expert, fetchVotes, fetchMyEvents]);

  const onRefresh = useCallback(async () => {
    setFetching(true);
    const promises = [refetchUser(), fetchVotes()];
    if (user?.is_expert) promises.push(fetchMyEvents());
    await Promise.all(promises);
    setFetching(false);
  }, [refetchUser, fetchVotes, fetchMyEvents, user?.is_expert]);

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("event-actions-modal");
  };

  const handleShare = () => {
    setActiveModal(null);
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)}>
        Функция в разработке
      </Snackbar>,
    );
  };

  const handleDeleteEvent = () => {
    setActiveModal(null);
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)}>
        Функция в разработке
      </Snackbar>,
    );
  };

  const handleSettingsChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { checked } = e.target;
    if (user) setCurrentUser({ ...user, show_community_rating: checked });
    try {
      const updatedUser = await apiPut("/users/me/settings", {
        show_community_rating: checked,
      });
      setCurrentUser(updatedUser);
    } catch (error) {
      if (user) setCurrentUser({ ...user, show_community_rating: !checked });
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
      />
      <ModalPage
        id="profile-settings-modal"
        onClose={() => setActiveModal(null)}
        header={<ModalPageHeader>Настройки</ModalPageHeader>}
      >
        <Group>
          <SimpleCell
            Component="label"
            disabled={!user?.is_expert}
            after={
              <Switch
                checked={user?.show_community_rating ?? true}
                onChange={handleSettingsChange}
              />
            }
          >
            Показывать народный рейтинг
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
