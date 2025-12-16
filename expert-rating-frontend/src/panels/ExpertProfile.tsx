import React, { useState } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Spinner,
  Placeholder,
  SegmentedControl,
  Header,
  Snackbar,
} from "@vkontakte/vkui";
import { useRouteNavigator, useParams } from "@vkontakte/vk-mini-apps-router";
import { Icon56CalendarOutline, Icon16Cancel } from "@vkontakte/icons";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import {
  ExpertProfileCard,
  ExpertProfileData,
} from "../components/Expert/ExpertProfileCard";
import { EventInfoCard } from "../components/Event/EventInfoCard";
import { groupPlannedEvents } from "../utils";
import { UserData, EventData } from "../types";

interface ExpertProfileProps {
  id: string;
  onReportPurchase: (expertId: number) => void;
}

interface ExpertEventsState {
  current: EventData[];
  past: EventData[];
}

const mapUserDataToExpertProfileData = (
  userData: UserData,
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
        events_count: userData.stats.events_count ?? 0,
      }
    : { expert: 0, community: 0, events_count: 0 },
  show_community_rating: userData.show_community_rating,
});

export const ExpertProfile = ({ id, onReportPurchase }: ExpertProfileProps) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<"expertId">();
  const expertId = params?.expertId;
  const { setSnackbar, setActiveModal, setTargetExpertId } = useUiStore();

  const { apiGet } = useApi();
  const { currentUser: user } = useUserStore();

  const [activeTab, setActiveTab] = useState("current");
  const isSelf = user?.vk_id === Number(expertId);

  const {
    data: expert,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["expertProfile", expertId],
    queryFn: async () => {
      if (!expertId) return null;
      return apiGet<UserData>(`/experts/${expertId}`);
    },
    enabled: !!expertId,
  });

  const { data: events, isLoading: areEventsLoading } = useQuery({
    queryKey: ["expertEvents", expertId],
    queryFn: async () => {
      if (!expertId) return { current: [], past: [] };
      return apiGet<ExpertEventsState>(`/events/expert/${expertId}`);
    },
    enabled: !!expertId,
  });

  const handleVoteClick = () => {
    if (isSelf) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Вы не можете голосовать за себя.
        </Snackbar>,
      );
      return;
    }
    if (expertId) {
      setTargetExpertId(Number(expertId));
    }
    setActiveModal("narod-vote-modal");
  };

  const handleReportClick = () => {
    if (expertId) {
      onReportPurchase(Number(expertId));
    }
  };

  const showFutureFeatureAlert = () => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)}>
        Функция в разработке
      </Snackbar>,
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

  if (isProfileLoading) {
    return (
      <Panel id={id}>
        <PanelHeader
          before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
        />
        <Spinner size="xl" />
      </Panel>
    );
  }

  if (isProfileError) {
    return (
      <Panel id={id}>
        <PanelHeader
          before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
        />
        <Placeholder title="Ошибка">
          Не удалось загрузить профиль эксперта.
        </Placeholder>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
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
              onReportClick={handleReportClick}
            />
          </Group>
          <Group style={{ marginTop: "8px" }}>
            <SegmentedControl
              value={activeTab}
              onChange={(value) => setActiveTab(String(value))}
              options={[
                { label: "Предстоящие", value: "current" },
                { label: "Завершенные", value: "past" },
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
                      "Завтра",
                    )}
                    {renderGroupedEvents(
                      groupedPlannedEvents.next7Days,
                      "Ближайшие 7 дней",
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
                      gap: "8px",
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
