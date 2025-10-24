import React, { useState, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Spinner,
  Placeholder,
  SegmentedControl,
  Header,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  Snackbar
} from "@vkontakte/vkui";
import { useRouteNavigator, useParams } from "@vkontakte/vk-mini-apps-router";
import {
  Icon56CalendarOutline,
  Icon16Done,
  Icon16Cancel
} from "@vkontakte/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import {
  ExpertProfileCard,
  ExpertProfileData
} from "../components/Expert/ExpertProfileCard";
import { VoteCard } from "../components/Vote/VoteCard";
import { EventInfoCard } from "../components/Event/EventInfoCard";
import { groupPlannedEvents } from "../utils/groupEventsByDate";
import { UserData, EventData } from "../types";

interface ExpertProfileProps {
  id: string;
}

interface ExpertEventsState {
  current: EventData[];
  past: EventData[];
}

const mapUserDataToExpertProfileData = (
  userData: UserData
): ExpertProfileData => ({
  first_name: userData.first_name,
  last_name: userData.last_name,
  photo_url: userData.photo_url,
  regalia: userData.regalia,
  social_link: userData.social_link,
  topics: userData.topics,
  stats: userData.stats
    ? {
      expert: userData.stats.expert ?? 0,
      community: userData.stats.community ?? 0,
      events_count: userData.stats.events_count ?? 0
    }
    : { expert: 0, community: 0, events_count: 0 },
  show_community_rating: userData.show_community_rating
});

export const ExpertProfile = ({ id }: ExpertProfileProps) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<"expertId">();
  const expertId = params?.expertId;

  const { apiGet, apiPost, apiDelete } = useApi();
  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar, activeModal, setActiveModal } = useUiStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("current");
  const isSelf = user?.vk_id === Number(expertId);

  const {
    data: expert,
    isLoading: isProfileLoading,
    isError: isProfileError
  } = useQuery({
    queryKey: ["expertProfile", expertId],
    queryFn: async () => {
      if (!expertId) return null;
      return apiGet<UserData>(`/experts/${expertId}`);
    },
    enabled: !!expertId
  });

  const { data: events, isLoading: areEventsLoading } = useQuery({
    queryKey: ["expertEvents", expertId],
    queryFn: async () => {
      if (!expertId) return { current: [], past: [] };
      return apiGet<ExpertEventsState>(`/events/expert/${expertId}`);
    },
    enabled: !!expertId
  });

  const handleVoteClick = () => {
    if (isSelf) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Вы не можете голосовать за себя.
        </Snackbar>
      );
      return;
    }
    setActiveModal("narod-vote-modal");
  };

  const handleVoteAction = async (votePayload: {
    vote_type: "trust" | "distrust";
    [key: string]: any;
  }) => {
    setActiveModal(null);
    setPopout(<Spinner size="l" />);
    if (!user || !expertId) return;
    const finalData = { voter_vk_id: user.vk_id, ...votePayload };

    try {
      await apiPost(`/experts/${expertId}/vote`, finalData);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expertProfile", expertId]
        }),
        queryClient.invalidateQueries({ queryKey: ["user", "me"] })
      ]);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Спасибо, ваше действие учтено!
        </Snackbar>
      );
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {err.message}
        </Snackbar>
      );
    } finally {
      setPopout(null);
    }
  };

  const handleCancelVoteAction = async () => {
    setPopout(<Spinner size="l" />);
    if (!expertId) return;

    try {
      await apiDelete(`/experts/${expertId}/vote`);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expertProfile", expertId]
        }),
        queryClient.invalidateQueries({ queryKey: ["user", "me"] })
      ]);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос отменен.
        </Snackbar>
      );
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {err.message}
        </Snackbar>
      );
    } finally {
      setPopout(null);
      setActiveModal(null);
    }
  };

  const showFutureFeatureAlert = () => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)}>
        Функция в разработке
      </Snackbar>
    );
  };

  const groupedPlannedEvents = groupPlannedEvents(events?.current || []);
  const renderGroupedEvents = (group: EventData[], title: string) =>
    group.length > 0 && (
      <React.Fragment key={title}>
        <Header>{title}</Header>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.map((event) => (
            <EventInfoCard key={event.id} event={event} />
          ))}
        </div>
      </React.Fragment>
    );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="narod-vote-modal"
        onClose={() => setActiveModal(null)}
        header={<ModalPageHeader before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}>Народное
          голосование</ModalPageHeader>}
        settlingHeight={100}
      >
        <VoteCard
          onSubmit={handleVoteAction}
          onCancelVote={handleCancelVoteAction}
          initialVote={expert?.current_user_vote_info}
          setPopout={setPopout}
        />
      </ModalPage>
    </ModalRoot>
  );

  if (isProfileLoading)
    return (
      <Panel id={id}>
        <Spinner size="xl" />
      </Panel>
    );
  if (isProfileError)
    return (
      <Panel id={id}>
        <Placeholder title="Ошибка">
          Не удалось загрузить профиль эксперта.
        </Placeholder>
      </Panel>
    );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Профиль эксперта
      </PanelHeader>
      {expert && (
        <>
          <Group>
            <ExpertProfileCard
              expert={mapUserDataToExpertProfileData(expert)}
              onVoteClick={handleVoteClick}
              onFutureFeatureClick={showFutureFeatureAlert}
            />
          </Group>
          <Group style={{ marginTop: "8px" }}>
            <SegmentedControl
              value={activeTab}
              onChange={(value) => setActiveTab(String(value))}
              options={[
                { label: "Предстоящие", value: "current" },
                { label: "Завершенные", value: "past" }
              ]}
            />
            <div style={{ paddingBottom: "60px" }}>
              {areEventsLoading && <Spinner size="l" />}
              {!areEventsLoading &&
                activeTab === "current" &&
                ((events?.current.length || 0) > 0 ? (
                  <>
                    {renderGroupedEvents(groupedPlannedEvents.today, "Сегодня")}
                    {renderGroupedEvents(
                      groupedPlannedEvents.tomorrow,
                      "Завтра"
                    )}
                    {renderGroupedEvents(
                      groupedPlannedEvents.next7Days,
                      "Ближайшие 7 дней"
                    )}
                    {renderGroupedEvents(groupedPlannedEvents.later, "Позже")}
                  </>
                ) : (
                  <Placeholder
                    icon={<Icon56CalendarOutline />}
                    title="Нет предстоящих мероприятий"
                  />
                ))}
              {!areEventsLoading &&
                activeTab === "past" &&
                ((events?.past.length || 0) > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    {events?.past.map((event) => (
                      <EventInfoCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <Placeholder
                    icon={<Icon56CalendarOutline />}
                    title="Нет завершенных мероприятий"
                  />
                ))}
            </div>
          </Group>
        </>
      )}
    </Panel>
  );
};
