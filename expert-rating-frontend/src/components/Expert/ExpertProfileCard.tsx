import React from "react";
import {
  Card,
  Avatar,
  Title,
  Text,
  Div,
  Tooltip,
  Header,
  IconButton,
} from "@vkontakte/vkui";
import {
  Icon20FavoriteCircleFillYellow,
  Icon20CheckCircleFillGreen,
  Icon24ListBulletSquareOutline,
  Icon28Profile,
  Icon28Users3Outline,
  Icon28AdvertisingOutline,
} from "@vkontakte/icons";
import "../css/ExpertProfileCard.css";

interface ExpertStats {
  expert?: number;
  community?: number;
  events_count?: number;
}

export interface ExpertProfileData {
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  regalia?: string;
  social_link?: string;
  topics?: string[];
  stats?: ExpertStats;
  show_community_rating: boolean;
}

interface ExpertProfileCardProps {
  expert?: ExpertProfileData | null;
  onVoteClick: () => void;
  onFutureFeatureClick: () => void;
}

export const ExpertProfileCard = ({
  expert,
  onVoteClick,
  onFutureFeatureClick,
}: ExpertProfileCardProps) => {
  if (!expert) return null;

  const {
    first_name = "",
    last_name = "",
    photo_url = "",
    regalia = "",
    social_link = "#",
    topics = [],
    stats = { expert: 0, community: 0, events_count: 0 },
    show_community_rating,
  } = expert;

  return (
    <Card mode="shadow">
      <Div className="expert-profile-header">
        <Avatar size={96} src={photo_url} />
        <div className="expert-profile-name-container">
          <Tooltip description="Перейти в профиль эксперта" placement="top">
            <IconButton
              href={social_link}
              target="_blank"
              aria-label="Перейти в профиль ВКонтакте"
            >
              <Icon28Profile
                style={{ color: "var(--vkui--color_icon_accent)" }}
              />
            </IconButton>
          </Tooltip>
          <Title level="2" className="expert-profile-name">
            {first_name} {last_name}
          </Title>
        </div>
      </Div>

      <div className="expert-profile-stats">
        <Tooltip description="Экспертный рейтинг">
          <div className="stat-item">
            <Icon20CheckCircleFillGreen width={28} height={28} />
            <Text className="stat-value">{stats.expert ?? 0}</Text>
          </div>
        </Tooltip>
        {show_community_rating && (
          <Tooltip description="Народный рейтинг">
            <div className="stat-item" onClick={onVoteClick}>
              <Icon20FavoriteCircleFillYellow width={28} height={28} />
              <Text className="stat-value">{stats.community ?? 0}</Text>
            </div>
          </Tooltip>
        )}
        <Tooltip description="Проведено мероприятий">
          <div className="stat-item">
            <Icon24ListBulletSquareOutline width={28} height={28} />
            <Text className="stat-value">{stats.events_count ?? 0}</Text>
          </div>
        </Tooltip>
      </div>

      {regalia && (
        <Div>
          <Header>О себе</Header>
          <Text className="expert-profile-regalia">{regalia}</Text>
        </Div>
      )}

      {topics && topics.length > 0 && (
        <div className="topics-section-container">
          <Header>Направления:</Header>
          <div className="topics-list">
            {topics.map((topic) => (
              <Text key={topic} className="topic-list-item">
                {topic}
              </Text>
            ))}
          </div>
        </div>
      )}

      <Div className="expert-profile-actions">
        <Tooltip
          description="Пригласить на мероприятие (в разработке)"
          placement="bottom"
        >
          <IconButton
            className="action-item-small"
            onClick={onFutureFeatureClick}
            aria-label="Пригласить на мероприятие"
          >
            <Icon28Users3Outline />
          </IconButton>
        </Tooltip>
        <Tooltip
          description="Пригласить на продюсирование (в разработке)"
          placement="bottom"
        >
          <IconButton
            className="action-item-small"
            onClick={onFutureFeatureClick}
            aria-label="Пригласить на продюсирование"
          >
            <Icon28AdvertisingOutline />
          </IconButton>
        </Tooltip>
      </Div>
    </Card>
  );
};
