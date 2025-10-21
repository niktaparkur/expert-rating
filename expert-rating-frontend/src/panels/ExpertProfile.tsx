import React, { useState, useEffect, useCallback } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Spinner,
  Placeholder,
  SegmentedControl,
  Snackbar,
  Header,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
} from "@vkontakte/vkui";
import { useRouteNavigator, useParams } from "@vkontakte/vk-mini-apps-router";
import {
  Icon56CalendarOutline,
  Icon16Done,
  Icon16Cancel,
} from "@vkontakte/icons";

import { useApi } from "../hooks/useApi";
import {
  ExpertProfileCard,
  ExpertProfileData,
} from "../components/ExpertProfileCard";
import { VoteCard } from "../components/VoteCard";
import { EventInfoCard } from "../components/EventInfoCard";
import { groupPlannedEvents } from "../utils/groupEventsByDate";
import { UserData, EventData } from "../types";

interface ExpertProfileProps {
  id: string;
  user: UserData | null;
  setPopout: (popout: React.ReactNode | null) => void;
  setSnackbar: (snackbar: React.ReactNode | null) => void;
  refetchUser: () => void;
}

interface ExpertEventsState {
  current: EventData[];
  past: EventData[];
}

const mapUserDataToExpertProfileData = (
  userData: UserData,
): ExpertProfileData => {
  return {
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
  };
};

export const ExpertProfile = ({
  id,
  user,
  setPopout,
  setSnackbar,
  refetchUser,
}: ExpertProfileProps) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<"expertId">();
  const expertId = params?.expertId;
  const { apiGet, apiPost, apiDelete } = useApi();

  const [expert, setExpert] = useState<UserData | null>(null);
  const [events, setEvents] = useState<ExpertEventsState>({
    current: [],
    past: [],
  });
  const [loading, setLoading] = useState({ profile: true, events: true });
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("current");

  const isSelf = user?.vk_id === Number(expertId);
  const initialVote = expert?.current_user_vote_info;

  const refetchExpert = useCallback(async () => {
    if (!expertId) return;
    try {
      const profileData = await apiGet(`/experts/${expertId}`);
      setExpert(profileData);
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Не удалось обновить профиль.
        </Snackbar>,
      );
    }
  }, [apiGet, expertId, setSnackbar]);

  useEffect(() => {
    if (!expertId) return;

    async function fetchData() {
      setLoading({ profile: true, events: true });
      setError(null);
      try {
        const [profileData, eventsData] = await Promise.all([
          apiGet(`/experts/${expertId}`),
          apiGet(`/events/expert/${expertId}`),
        ]);
        setExpert(profileData);
        setEvents(eventsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading({ profile: false, events: false });
      }
    }

    fetchData();
  }, [expertId, apiGet]);

  const handleVoteClick = () => {
    if (isSelf) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Вы не можете голосовать за себя.
        </Snackbar>,
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
      await Promise.all([refetchExpert(), refetchUser()]);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Спасибо, ваше действие учтено!
        </Snackbar>,
      );
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {err.message}
        </Snackbar>,
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
      await Promise.all([refetchExpert(), refetchUser()]);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос отменен.
        </Snackbar>,
      );
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {err.message}
        </Snackbar>,
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
      </Snackbar>,
    );
  };

  const groupedPlannedEvents = groupPlannedEvents(events.current);
  const renderGroupedEvents = (group: EventData[], title: string) =>
    group.length > 0 && (
      <React.Fragment key={title}>
        <Header>{title}</Header>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.map((event) => (
            <EventInfoCard key={event.id} event={event} onClick={() => {}} />
          ))}
        </div>
      </React.Fragment>
    );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="narod-vote-modal"
        onClose={() => setActiveModal(null)}
        header={<ModalPageHeader>Народное голосование</ModalPageHeader>}
        settlingHeight={100}
      >
        <VoteCard
          onSubmit={handleVoteAction}
          onCancelVote={handleCancelVoteAction}
          initialVote={initialVote}
          setPopout={setPopout}
        />
      </ModalPage>
    </ModalRoot>
  );

  if (loading.profile)
    return (
      <Panel id={id}>
        <Spinner size="l" />
      </Panel>
    );
  if (error)
    return (
      <Panel id={id}>
        <Placeholder title="Ошибка">{error}</Placeholder>
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
          <Group>
            <SegmentedControl
              value={activeTab}
              onChange={(value) => setActiveTab(String(value))}
              options={[
                { label: "Предстоящие", value: "current" },
                {
                  label: "Завершенные",
                  value: "past",
                },
              ]}
            />
            <div style={{ paddingBottom: "60px" }}>
              {loading.events && <Spinner size="l" />}
              {!loading.events &&
                activeTab === "current" &&
                (events.current.length > 0 ? (
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
              {!loading.events &&
                activeTab === "past" &&
                (events.past.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {events.past.map((event) => (
                      <EventInfoCard
                        key={event.id}
                        event={event}
                        onClick={() => {}}
                      />
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
