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
  Header,
  Snackbar,
  FormStatus,
  Div,
  Button,
} from "@vkontakte/vkui";
import { useRouteNavigator, useParams } from "@vkontakte/vk-mini-apps-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import bridge from "@vkontakte/vk-bridge";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { MiniExpertProfile } from "../components/Shared/MiniExpertProfile";
import { VoteCard } from "../components/Vote/VoteCard";
import {
  Icon56ErrorTriangleOutline,
  Icon56RecentOutline,
  Icon16Cancel,
} from "@vkontakte/icons";
import { EventStatusData } from "../types";

interface VotingProps {
  id: string;
}

export const Voting = ({ id }: VotingProps) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<"promo">();
  const promo = params?.promo;
  const { apiGet, apiPost, apiPut } = useApi();
  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar, setActiveModal, setVoteSuccessMessage } =
    useUiStore();
  const queryClient = useQueryClient();

  const [isBannerHiding, setIsBannerHiding] = useState(false);
  const [isBannerHidden, setIsBannerHidden] = useState(false);

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

  const groupId = Number(import.meta.env.VITE_VK_GROUP_ID);

  const handleAllowMessages = async () => {
    try {
      const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
        group_id: Math.abs(groupId),
      });

      if (result.result) {
        setIsBannerHiding(true);

        setTimeout(() => {
          setIsBannerHidden(true);
        }, 300);

        // 3. В фоне сохраняем настройки на сервере и обновляем кэш юзера
        await apiPut("/users/me/settings", { allow_notifications: true });
        await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      }
    } catch (e: any) {
      console.error("Ошибка при запросе разрешения на сообщения:", e);
    }
  };

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
      setVoteSuccessMessage(response.thank_you_message);

      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["eventStatus", promo] });
      setActiveModal("vote-success-modal");
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

  const renderContent = () => {
    if (isLoading) return <Spinner size="xl" style={{ marginTop: 20 }} />;
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
            <div
              style={{
                transition: "all 0.3s ease-in-out",
                maxHeight: isBannerHiding ? 0 : 500,
                opacity: isBannerHiding ? 0 : 1,
                overflow: "hidden",
                margin: 0,
                padding: 0,
              }}
            >
              {eventData.has_message &&
                !user?.allow_notifications &&
                !isBannerHidden && (
                  <Group>
                    <Div>
                      <FormStatus title="Важное предупреждение">
                        У вас запрещены сообщения от нашего сообщества. Из-за
                        этого вы не сможете получить бонус или ответное
                        сообщение от эксперта после голосования.
                        <div style={{ marginTop: 12 }}>
                          <Button mode="primary" onClick={handleAllowMessages}>
                            Разрешить сообщения
                          </Button>
                        </div>
                      </FormStatus>
                    </Div>
                  </Group>
                )}
            </div>

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

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Голосование
      </PanelHeader>
      {renderContent()}
    </Panel>
  );
};
