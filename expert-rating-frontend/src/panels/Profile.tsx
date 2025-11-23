import React, { useState, useMemo, useCallback } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Search,
  Placeholder,
  Spinner,
  Alert,
  Header,
  Snackbar,
  PullToRefresh,
  Button,
} from "@vkontakte/vkui";
import {
  Icon56UsersOutline,
  Icon16Cancel,
  Icon16Done,
  Icon24Add,
} from "@vkontakte/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { UserProfile } from "../components/Profile/UserProfile";
import { VoteHistoryCard } from "../components/Profile/VoteHistoryCard";
import { EventInfoCard } from "../components/Event/EventInfoCard";
import { TabbedGroup } from "../components/Shared/TabbedGroup";
import { EmptyEventsState } from "../components/Shared/EmptyEventsState";

import { groupPlannedEvents } from "../utils";
import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { EventData } from "../types";

interface ProfileProps {
  id: string;
  onOpenCreateEventModal: () => void;
  onEventClick: (event: EventData) => void;
}

export const Profile = ({
  id,
  onOpenCreateEventModal,
  onEventClick,
}: ProfileProps) => {
  const { apiGet, apiDelete } = useApi();
  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar, setActiveModal } = useUiStore();
  const queryClient = useQueryClient();

  const [isFetching, setFetching] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("votes");
  const [searchQueryVotes, setSearchQueryVotes] = useState("");

  const { data: votes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ["userVotes", user?.vk_id],
    queryFn: () => apiGet<any[]>("/users/me/votes"),
    enabled: !!user,
  });

  const { data: myEvents, isLoading: isLoadingMyEvents } = useQuery({
    queryKey: ["myEvents", user?.vk_id],
    queryFn: () => apiGet<EventData[]>("/events/my"),
    enabled: !!user?.is_expert,
  });

  const onRefresh = useCallback(async () => {
    setFetching(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user", "me"] }),
      queryClient.invalidateQueries({ queryKey: ["userVotes", user?.vk_id] }),
      user?.is_expert
        ? queryClient.invalidateQueries({ queryKey: ["myEvents", user?.vk_id] })
        : Promise.resolve(),
    ]);
    setFetching(false);
  }, [queryClient, user?.vk_id, user?.is_expert]);

  const performCancelVote = async (voteId: number, isExpertVote: boolean) => {
    const endpoint = isExpertVote
      ? `/events/vote/${voteId}/cancel`
      : `/experts/vote/${voteId}/cancel`;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(endpoint);
      await queryClient.invalidateQueries({
        queryKey: ["userVotes", user?.vk_id],
      });
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

  const filteredVotes = useMemo(() => {
    const query = searchQueryVotes.toLowerCase().trim();
    if (!query) return votes || [];
    return (votes || []).filter((vote: any) => {
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
    (myEvents || []).forEach((event) => {
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
              onClick={onEventClick}
              showActions={true}
            />
          ))}
        </div>
      </React.Fragment>
    );

  const renderEventsContent = () => (
    <div style={{ paddingBottom: "60px" }}>
      <Group
        header={
          <Header
            indicator={`${planned.length}`}
            after={
              planned.length > 0 ? (
                <Button
                  mode="tertiary"
                  before={<Icon24Add />}
                  onClick={onOpenCreateEventModal}
                >
                  Создать
                </Button>
              ) : undefined
            }
          >
            Запланированные
          </Header>
        }
      >
        {isLoadingMyEvents ? (
          <Spinner size="l" />
        ) : planned.length === 0 && archived.length === 0 ? (
          <EmptyEventsState onCreate={onOpenCreateEventModal} />
        ) : planned.length === 0 ? (
          <Placeholder
            action={<Button onClick={onOpenCreateEventModal}>+ Создать</Button>}
          >
            Нет запланированных мероприятий
          </Placeholder>
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
        <Group header={<Header>Архив</Header>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {archived.map((event) => (
              <EventInfoCard
                key={event.id}
                event={event}
                onClick={onEventClick}
                showActions={true}
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );

  const renderVotesContent = () => (
    <>
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
    </>
  );

  const tabsConfig = useMemo(() => {
    const tabs = [
      { id: "votes", title: "Мои голоса", content: renderVotesContent() },
    ];
    if (user?.is_expert) {
      tabs.push({
        id: "events",
        title: "Мои мероприятия",
        content: renderEventsContent(),
      });
    }
    return tabs;
  }, [
    user?.is_expert,
    isLoadingVotes,
    filteredVotes,
    isLoadingMyEvents,
    planned,
    archived,
  ]);

  return (
    <Panel id={id}>
      <PanelHeader>Аккаунт</PanelHeader>
      <PullToRefresh onRefresh={onRefresh} isFetching={isFetching}>
        <UserProfile
          user={user}
          onSettingsClick={() => setActiveModal("profile-settings-modal")}
          onWithdraw={() => {}}
          isWithdrawLoading={isWithdrawLoading}
          onEditClick={() => setActiveModal("edit-regalia-modal")} // Добавляем обработчик
        />
        <TabbedGroup
          tabs={tabsConfig}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id)}
        />
      </PullToRefresh>
    </Panel>
  );
};
