import React, { useState } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Spinner,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  Placeholder,
  Button,
  Header,
  Snackbar,
  Text,
} from "@vkontakte/vkui";
import { useRouteNavigator, useParams } from "@vkontakte/vk-mini-apps-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { MiniExpertProfile } from "../components/Shared/MiniExpertProfile";
import { VoteCard } from "../components/Vote/VoteCard";
import {
  Icon56CheckCircleOutline,
  Icon56ErrorTriangleOutline,
  Icon56RecentOutline,
  Icon16Cancel
} from "@vkontakte/icons";
import { EventStatusData } from "../types";

interface VotingProps {
  id: string;
}

export const Voting = ({ id }: VotingProps) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<"promo">();
  const promo = params?.promo;
  const { apiGet, apiPost } = useApi();
  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar, activeModal, setActiveModal } = useUiStore();
  const queryClient = useQueryClient();

  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  const {
    data: eventData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["eventStatus", promo],
    queryFn: async () => {
      if (!promo) return null;
      return apiGet<EventStatusData>(`/events/status/${promo}`);
    },
    enabled: !!promo,
  });

  const handleEventVoteSubmit = async (voteData: {
    vote_type: "trust" | "distrust" | "remove";
    comment: string;
  }) => {
    if (!user?.vk_id) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Не удалось определить ваш ID.
        </Snackbar>,
      );
      return;
    }

    setPopout(<Spinner size="xl" />);
    const finalData = {
      promo_word: promo,
      voter_vk_id: user.vk_id,
      ...voteData,
    };

    try {
      const response = await apiPost<any>("/events/vote", finalData);
      setThankYouMessage(response.thank_you_message);
      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["eventStatus", promo] });
      setActiveModal("vote-success-modal");
    } catch (err: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>{err.message}</Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const renderContent = () => {
    if (isLoading) return <Spinner size="xl" />;
    if (isError)
      return (
        <Placeholder icon={<Icon56ErrorTriangleOutline />} title="Ошибка">
          {(error as Error).message}
        </Placeholder>
      );
    if (!eventData) return <Placeholder title="Загрузка..." />;

    switch (eventData.status) {
      case "active":
        return (
          <>
            <Group header={<Header>Эксперт мероприятия</Header>}>
              <MiniExpertProfile expert={eventData.expert} />
            </Group>
            <VoteCard
              onSubmit={handleEventVoteSubmit}
              initialVote={
                eventData.current_vote?.vote_value
                  ? {
                    vote_type:
                      eventData.current_vote.vote_value === 1
                        ? "trust"
                        : "distrust",
                    comment: eventData.current_vote.last_comment,
                  }
                  : null
              }
              setPopout={setPopout}
            />
          </>
        );
      case "not_started":
        const startTime = new Date(eventData.start_time).toLocaleString(
          "ru-RU",
          {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          },
        );
        return (
          <Placeholder
            icon={<Icon56RecentOutline />}
            title="Голосование еще не началось"
          >{`Начало голосования: ${startTime}`}</Placeholder>
        );
      case "finished":
        return (
          <Placeholder
            icon={<Icon56RecentOutline />}
            title="Голосование завершено"
          >
            Вы больше не можете оставить свой голос на этом мероприятии.
          </Placeholder>
        );
      default:
        return (
          <Placeholder
            icon={<Icon56ErrorTriangleOutline />}
            title="Мероприятие не найдено"
          >
            Проверьте правильность введенного промо-слова.
          </Placeholder>
        );
    }
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="vote-success-modal"
        onClose={() => setActiveModal(null)}
        header={<ModalPageHeader>Голос принят!</ModalPageHeader>}
        settlingHeight={100}
      >
        <Placeholder
          icon={
            <Icon56CheckCircleOutline
              style={{ color: "var(--vkui--color_icon_positive)" }}
            />
          }
          title="Спасибо, ваш голос учтен!"
          action={
            <Button
              size="l"
              mode="primary"
              onClick={() =>
                routeNavigator.push(`/expert/${eventData?.expert?.vk_id}`)
              }
            >
              Перейти к профилю эксперта
            </Button>
          }
        >
          {thankYouMessage ? (
            <Text>{thankYouMessage}</Text>
          ) : (
            "Он будет засчитан в экспертный рейтинг."
          )}
        </Placeholder>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Голосование
      </PanelHeader>
      {renderContent()}
    </Panel>
  );
};