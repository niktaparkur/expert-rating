import React from "react";
import { Card, RichCell, Avatar, Button, Text } from "@vkontakte/vkui";
import {
  Icon20CancelCircleFillRed,
  Icon20CheckCircleFillGreen,
  Icon20InfoCircleOutline,
  Icon24HistoryBackwardOutline,
} from "@vkontakte/icons";
import { VoteData } from "../../types";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";

interface VoteHistoryCardProps {
  vote: VoteData;
  onOpenHistory: (expertId: number, ratingType: "expert" | "community") => void;
}

export const VoteHistoryCard = ({
  vote,
  onOpenHistory,
}: VoteHistoryCardProps) => {
  const routeNavigator = useRouteNavigator();

  const isExpertType = vote.is_expert_vote;
  const ratingTypeLabel = isExpertType ? "Экспертный рейтинг" : "Народный рейтинг";

  const currentVoteValue = vote.rating_snapshot; 

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

  const currentType: "expert" | "community" = isExpertType ? "expert" : "community";

  const handleNavigateToExpert = () => {
    routeNavigator.push(`/expert/${expert.vk_id}`);
  };

  return (
    <Card mode="shadow" style={{ marginBottom: "8px" }}>
      <RichCell
        disabled
        multiline
        // Центрирование контента через пропсы VKUI и flex
        style={{ display: 'flex', alignItems: 'center' }} 
        before={
          <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center' }}>
             <Avatar
              size={48}
              src={expert.photo_url}
              onClick={handleNavigateToExpert}
              style={{ cursor: "pointer" }}
            />
          </div>
        }
        subtitle={
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <Text style={{ color: "var(--vkui--color_text_subhead)", fontSize: "12px" }}>
              {ratingTypeLabel}
            </Text>
            {vote.comment && (
              <Text style={{ color: "var(--vkui--color_text_primary)", fontSize: "14px", margin: "2px 0" }}>
                {vote.comment}
              </Text>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <VoteIcon width={14} height={14} />
              <Text style={{ color: voteColor, fontSize: "13px", fontWeight: 500 }}>
                {voteText}
              </Text>
            </div>
          </div>
        }
        after={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "6px",
              minWidth: "90px",
            }}
          >
            <Button
              mode="secondary"
              size="s"
              onClick={handleNavigateToExpert}
              stretched
            >
              Профиль
            </Button>
            <Button
              mode="outline"
              size="s"
              before={<Icon24HistoryBackwardOutline width={14} height={14} />}
              onClick={() => onOpenHistory(expert.vk_id, currentType)}
              stretched
            >
              История
            </Button>
          </div>
        }
      >
        <Text weight="1" useAccentWeight style={{ fontSize: "16px" }}>
          {expert.first_name} {expert.last_name}
        </Text>
      </RichCell>
    </Card>
  );
};