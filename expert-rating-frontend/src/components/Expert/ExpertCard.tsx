import React from "react";
import { Card, Avatar, Title, Text } from "@vkontakte/vkui";
import {
  Icon20CheckCircleFillGreen,
  Icon20FavoriteCircleFillYellow,
} from "@vkontakte/icons";
import "../css/ExpertCard.css";

interface ExpertStats {
  expert: number;
  community: number;
}

interface ExpertData {
  vk_id: number;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  topics?: string[];
  show_community_rating: boolean;
  stats?: ExpertStats;
}

interface ExpertCardProps {
  expert: ExpertData & { rank?: number };
  onClick: () => void;
}

const RatingBlock = ({
  expertRating,
  communityRating,
  showCommunityRating,
}: {
  expertRating: number;
  communityRating: number;
  showCommunityRating: boolean;
}) => {
  return (
    <div
      className={`rating-block ${showCommunityRating ? "double" : "single"}`}
    >
      <div className="rating-segment">
        <div className="rating-value">{expertRating}</div>
        <Icon20CheckCircleFillGreen
          width={20}
          height={20}
          aria-label="Экспертный рейтинг"
        />
      </div>
      {showCommunityRating && (
        <>
          <div className="rating-separator"></div>
          <div className="rating-segment">
            <div className="rating-value">{communityRating}</div>
            <Icon20FavoriteCircleFillYellow
              width={20}
              height={20}
              aria-label="Народный рейтинг"
            />
          </div>
        </>
      )}
    </div>
  );
};

export const ExpertCard = ({ expert, onClick }: ExpertCardProps) => {
  if (!expert) {
    return null;
  }

  const name = expert.first_name || "";
  const surname = expert.last_name || "";
  const photo = expert.photo_url || "";

  const topicsString = (expert.topics || [])
    .map((topic) => {
      const parts = topic.split(" > ");
      return parts[parts.length - 1];
    })
    .join(", ");

  const expertRating = expert.stats?.expert || 0;
  const communityRating = expert.stats?.community || 0;
  const displayRank = expert.rank ? expert.rank : "-";

  return (
    <Card mode="shadow" onClick={onClick} className="expert-card-container">
      <div className="expert-card-main">
        <div className="expert-card-position">
          <Text className="position-number">{displayRank}</Text>
        </div>
        <Avatar size={48} src={photo} />
        <div className="expert-card-info">
          <Title level="3" className="expert-name">
            {name} {surname}
          </Title>
          {topicsString && (
            <Text className="expert-topics-text">{topicsString}</Text>
          )}
        </div>
        <RatingBlock
          expertRating={expertRating}
          communityRating={communityRating}
          showCommunityRating={expert.show_community_rating}
        />
      </div>
    </Card>
  );
};
