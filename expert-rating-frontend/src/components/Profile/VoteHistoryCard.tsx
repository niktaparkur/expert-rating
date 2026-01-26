import React from "react";
import { Card, RichCell, Avatar, Button, Text, Spacing } from "@vkontakte/vkui";
import {
  Icon20CancelCircleFillRed,
  Icon20CheckCircleFillGreen,
  Icon20InfoCircleOutline,
  Icon24ChevronRight,
} from "@vkontakte/icons";
import { VoteData } from "../../types";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";

interface VoteHistoryCardProps {
  vote: VoteData;
  onOpenHistory: (expertId: number, ratingType: "expert" | "community") => void;
  onRemoveVote: (expertId: number, ratingType: "expert" | "community") => void;
}

export const VoteHistoryCard = ({
  vote,
  onOpenHistory,
  onRemoveVote,
}: VoteHistoryCardProps) => {
  const routeNavigator = useRouteNavigator();

  const isExpertType = vote.is_expert_vote;
  const ratingTypeLabel = isExpertType ? "Экспертный рейтинг" : "Народный рейтинг";

  const currentVoteValue = vote.rating_snapshot; // Мы прокинули ТЕКУЩЕЕ состояние в это поле на бэкенде

  let VoteIcon = Icon20InfoCircleOutline;
  let voteText = "Нейтрально";
  let voteColor = "var(--vkui--color_text_secondary)";

  if (currentVoteValue === 1) {
    VoteIcon = Icon20CheckCircleFillGreen;
    voteText = "Доверяю";
    voteColor = "var(--vkui--color_icon_positive)";
  } else if (currentVoteValue === -1) {
    VoteIcon = Icon20CancelCircleFillRed;
    voteText = "Не доверяю";
    voteColor = "var(--vkui--color_icon_negative)";
  }

  const expert = isExpertType && vote.event ? vote.event.expert_info : vote.expert;

  if (!expert) return null;

  const handleNavigateToExpert = () => {
    routeNavigator.push(`/expert/${expert.vk_id}`);
  };

  const currentType: "expert" | "community" = isExpertType ? "expert" : "community";

  return (
    <Card mode="shadow">
      <RichCell
        before={<Avatar size={48} src={expert.photo_url} onClick={handleNavigateToExpert} style={{ cursor: 'pointer' }} />}
        subtitle={
          <Text style={{ color: "var(--vkui--color_text_subhead)", fontSize: "13px" }}>
            {ratingTypeLabel}
          </Text>
        }
        after={
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '4px', minWidth: '100px' }}>
            <Button
              mode="secondary"
              size="s"
              onClick={handleNavigateToExpert}
              stretched
            >
              К профилю
            </Button>
            <Button
              mode="tertiary"
              size="s"
              onClick={() => onOpenHistory(expert.vk_id, currentType)}
              stretched
            >
              История
            </Button>
            {currentVoteValue !== 0 && (
              <Button
                mode="tertiary"
                appearance="negative"
                size="s"
                onClick={() => onRemoveVote(expert.vk_id, currentType)}
                stretched
              >
                Убрать голос
              </Button>
            )}
          </div>
        }
        multiline
      >
        <Text weight="1" useAccentWeight>
          {expert.first_name} {expert.last_name}
        </Text>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "4px",
          }}
        >
          <VoteIcon width={16} height={16} />
          <Text style={{ color: voteColor, fontSize: "14px", fontWeight: 500 }}>
            {voteText}
          </Text>
        </div>
      </RichCell>
    </Card>
  );
};
