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
  Div,
  Text,
  ModalPage,
  ModalPageHeader,
  SimpleCell,
  Switch,
  Separator,
  PanelHeaderBack,
} from "@vkontakte/vkui";
import { Icon56UsersOutline, Icon16Cancel, Icon16Done } from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { UserProfile } from "../components/Profile/UserProfile";
import { VoteHistoryCard } from "../components/Profile/VoteHistoryCard";
import { EventInfoCard } from "../components/Event/EventInfoCard";
import { TabbedGroup } from "../components/Shared/TabbedGroup";

import { groupPlannedEvents } from "../utils";
import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { EventData, UserData } from "../types";

const GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID);

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
  const { apiGet, apiDelete, apiPut } = useApi();
  const { currentUser: user, setCurrentUser } = useUserStore();
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

  const handleEventClick = (event: EventData) => {
    onEventClick(event);
  };

  const handleSettingsChange = async (fieldName: string, value: boolean) => {
    if (!user) return;
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
              onClick={handleEventClick}
              showActions={true}
            />
          ))}
        </div>
      </React.Fragment>
    );

  const renderEventsContent = () => (
    <div style={{ paddingBottom: "60px" }}>
      <Group>
        <Header>Управление</Header>
        <Div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button
            stretched
            size="l"
            mode="secondary"
            onClick={onOpenCreateEventModal}
          >
            + Добавить Мероприятие
          </Button>
          <Button
            stretched
            size="l"
            mode="secondary"
            onClick={() => setActiveModal("create-mailing-modal")}
          >
            Создать рассылку
          </Button>
        </Div>
      </Group>
      <Header indicator={`${planned.length}`}>Запланированные</Header>
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
      {archived.length > 0 && (
        <>
          <Separator style={{ margin: "12px 0" }} />
          <Header>Архив</Header>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {archived.map((event) => (
              <EventInfoCard
                key={event.id}
                event={event}
                onClick={handleEventClick}
                showActions={true}
              />
            ))}
          </div>
        </>
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
