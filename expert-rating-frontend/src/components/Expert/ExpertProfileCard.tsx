import React, { useRef, useState } from "react";
import {
  Card,
  Avatar,
  Title,
  Text,
  Div,
  Tooltip,
  Header,
  IconButton,
  useAdaptivity,
  ViewWidth,
} from "@vkontakte/vkui";
import {
  Icon20FavoriteCircleFillYellow,
  Icon20CheckCircleFillGreen,
  Icon24ListBulletSquareOutline,
  Icon28Profile,
  Icon28Users3Outline,
  Icon28AdvertisingOutline,
  Icon28DocumentTextOutline,
} from "@vkontakte/icons";
import "../css/ExpertProfileCard.css";

interface ExpertStats {
  expert?: number;
  expert_trust?: number;
  expert_distrust?: number;
  community?: number;
  community_trust?: number;
  community_distrust?: number;
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
  onReportClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export const ExpertProfileCard = ({
  expert,
  onVoteClick,
  onFutureFeatureClick,
  onReportClick,
}: ExpertProfileCardProps) => {
  const { viewWidth } = useAdaptivity();
  const isDesktop = (viewWidth ?? 0) >= ViewWidth.TABLET;

  const [ratingTooltipShown, setRatingTooltipShown] = useState(false);
  const [expertTooltipShown, setExpertTooltipShown] = useState(false);
  const ratingRef = useRef<HTMLDivElement>(null);
  const expertRef = useRef<HTMLDivElement>(null);

  if (!expert) return null;

  const {
    first_name = "",
    last_name = "",
    photo_url = "",
    regalia = "",
    social_link = "#",
    topics = [],
    stats = {
      expert: 0,
      expert_trust: 0,
      expert_distrust: 0,
      community: 0,
      events_count: 0,
      community_trust: 0,
      community_distrust: 0,
    },
    show_community_rating,
  } = expert;

  const communityTooltipText = "Народный рейтинг";
  const expertTooltipText = "Экспертный рейтинг";

  return (
    <Card mode="shadow" style={{ position: "relative" }}>
      {/* <IconButton
        onClick={onReportClick}
        aria-label="Скачать отчет"
        style={{ position: "absolute", top: 4, right: 4, zIndex: 2 }}
      >
        <Icon28DocumentTextOutline />
      </IconButton> */}

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
        <Tooltip
          description={expertTooltipText}
          shown={isDesktop ? undefined : expertTooltipShown}
          onShownChange={setExpertTooltipShown}
        >
          <div
            className="stat-item"
            onClick={() => setExpertTooltipShown(!expertTooltipShown)}
            ref={expertRef}
          >
            <Icon20CheckCircleFillGreen width={28} height={28} />
            <Text className="stat-value">{stats.expert ?? 0}</Text>
          </div>
        </Tooltip>

        {show_community_rating && (
          <Tooltip
            shown={isDesktop ? undefined : ratingTooltipShown}
            onShownChange={setRatingTooltipShown}
            description={communityTooltipText}
            placement="bottom"
          >
            <div
              className="stat-item"
              onClick={() => {
                setRatingTooltipShown(!ratingTooltipShown);
                onVoteClick();
              }}
              ref={ratingRef}
            >
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
        <Div className="compact-div">
          <Header className="compact-header">О себе</Header>
          <Text className="expert-profile-regalia">{regalia}</Text>
        </Div>
      )}

      {topics && topics.length > 0 && (
        <div className="topics-section-container">
          <Header className="compact-header">Направления:</Header>
          <Div style={{ paddingBottom: 12, paddingTop: 4 }}>
            <Text className="topics-text">{topics.join(" • ")}</Text>
          </Div>
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
