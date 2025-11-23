import React, { useRef, useState } from "react";
import {
  Group,
  Card,
  Avatar,
  Title,
  Text,
  Div,
  Tooltip,
  IconButton,
  Header,
  Button,
  RichCell,
  Placeholder,
  Spinner,
  useAdaptivity,
  ViewWidth,
} from "@vkontakte/vkui";
import {
  Icon20FavoriteCircleFillYellow,
  Icon20CheckCircleFillGreen,
  Icon24ListBulletSquareOutline,
  Icon28SettingsOutline,
  Icon56RecentOutline,
  Icon20CheckCircleOutline,
  Icon20CancelCircleOutline,
} from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { UserData } from "../../types";

interface UserProfileProps {
  user: UserData | null;
  onSettingsClick: () => void;
  onWithdraw: () => void;
  isWithdrawLoading: boolean;
  onEditClick?: () => void;
}

export const UserProfile = ({
  user,
  onSettingsClick,
  onWithdraw,
  isWithdrawLoading,
}: UserProfileProps) => {
  const { viewWidth } = useAdaptivity();
  const isDesktop = (viewWidth ?? 0) >= ViewWidth.TABLET;
  const routeNavigator = useRouteNavigator();

  const [expertTooltipShown, setExpertTooltipShown] = useState(false);
  const [communityTooltipShown, setCommunityTooltipShown] = useState(false);

  const expertRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const getRoleText = () => {
    const roles = [];
    if (user.is_admin) roles.push("Администратор");
    if (user.is_expert) roles.push("Эксперт");
    if (roles.length === 0) return "Пользователь";
    return roles.join(" | ");
  };
  const isPending = user.status === "pending";
  const isApprovedExpert = user.is_expert && user.status === "approved";

  const stats = user.stats || {
    expert: 0,
    expert_trust: 0,
    expert_distrust: 0,
    community: 0,
    community_trust: 0,
    community_distrust: 0,
    events_count: 0,
  };

  return (
    <>
      <Group>
        <Card mode="shadow">
          <RichCell
            before={<Avatar size={96} src={user.photo_url} />}
            after={
              <IconButton
                onClick={onSettingsClick}
                aria-label="Настройки профиля"
              >
                <Icon28SettingsOutline />
              </IconButton>
            }
            subtitle={getRoleText()}
            disabled
          >
            <Title level="2">
              {user.first_name} {user.last_name}
            </Title>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "4px",
              }}
            >
              <Tooltip description="Отдано голосов 'Доверяю'">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--vkui--color_text_positive)",
                  }}
                >
                  <Icon20CheckCircleOutline />
                  <Text>{user.my_votes_stats?.trust || 0}</Text>
                </div>
              </Tooltip>
              <Tooltip description="Отдано голосов 'Не доверяю'">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--vkui--color_text_negative)",
                  }}
                >
                  <Icon20CancelCircleOutline />
                  <Text>{user.my_votes_stats?.distrust || 0}</Text>
                </div>
              </Tooltip>
            </div>
            {isApprovedExpert && (
              <Div
                style={{
                  textAlign: "left",
                  color: "var(--vkui--color_text_secondary)",
                  paddingTop: 4,
                  paddingBottom: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >
                <Text>Тариф: {user.tariff_plan || "Начальный"}</Text>
              </Div>
            )}
          </RichCell>

          {isPending && (
            <Placeholder
              icon={<Icon56RecentOutline />}
              title="Заявка на модерации"
              action={
                <Button
                  size="m"
                  appearance="negative"
                  onClick={onWithdraw}
                  disabled={isWithdrawLoading}
                  after={isWithdrawLoading ? <Spinner size="s" /> : null}
                >
                  Отозвать заявку
                </Button>
              }
            >
              Ваша анкета находится на рассмотрении.
            </Placeholder>
          )}

          {isApprovedExpert && (
            <>
              <Div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "16px",
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderTop: "1px solid var(--vkui--color_separator_primary)",
                  borderBottom:
                    "1px solid var(--vkui--color_separator_primary)",
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                {/* Экспертный рейтинг */}
                <Tooltip
                  shown={isDesktop ? undefined : expertTooltipShown}
                  onShownChange={setExpertTooltipShown}
                  description={`Экспертный рейтинг (👍 ${stats.community_trust ?? 0} | 👎 ${stats.community_distrust ?? 0})`}
                >
                  <div
                    className="stat-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => setExpertTooltipShown(!expertTooltipShown)}
                    ref={expertRef}
                  >
                    <Icon20CheckCircleFillGreen />
                    <Title level="3">{stats.expert}</Title>
                  </div>
                </Tooltip>

                {/* Народный рейтинг */}
                <Tooltip
                  shown={isDesktop ? undefined : communityTooltipShown}
                  onShownChange={setCommunityTooltipShown}
                  description={`Народный рейтинг (👍 ${stats.community_trust ?? 0} | 👎 ${stats.community_distrust ?? 0})`}
                >
                  <div
                    className="stat-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() =>
                      setCommunityTooltipShown(!communityTooltipShown)
                    }
                    ref={communityRef}
                  >
                    <Icon20FavoriteCircleFillYellow />
                    <Title level="3">{stats.community}</Title>
                  </div>
                </Tooltip>

                <Tooltip description="Проведено мероприятий">
                  <div
                    className="stat-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Icon24ListBulletSquareOutline width={20} height={20} />
                    <Title level="3">{stats.events_count}</Title>
                  </div>
                </Tooltip>
              </Div>

              {/* Блок "О себе" без кнопки редактирования (она теперь в настройках) */}
              <Div style={{ paddingTop: 4, paddingBottom: 4 }}>
                <Header style={{ margin: 0 }}>О себе</Header>
              </Div>
              {user.regalia && (
                <Div style={{ paddingTop: 0, paddingBottom: 8 }}>
                  <Text style={{ whiteSpace: "pre-wrap" }}>{user.regalia}</Text>
                </Div>
              )}

              {user.topics && user.topics.length > 0 && (
                <div style={{ padding: "0 16px 12px 16px" }}>
                  <Header style={{ margin: "4px 0 2px 0" }}>
                    Направления:
                  </Header>
                  <Text style={{ lineHeight: 1.3 }}>
                    {user.topics.join(" • ")}
                  </Text>
                </div>
              )}
            </>
          )}

          {!user.is_expert && !isPending && (
            <Div>
              <Button
                stretched
                size="l"
                mode="secondary"
                onClick={() => routeNavigator.push("/registration")}
              >
                Стать экспертом
              </Button>
            </Div>
          )}
        </Card>
      </Group>
    </>
  );
};
