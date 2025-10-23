import React from "react";
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
  SimpleCell,
  Button,
  RichCell,
  Placeholder,
  Spinner,
  SegmentedControl,
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
import { UserData } from "../types";

interface UserProfileProps {
  user: UserData | null;
  onSettingsClick: () => void;
  onWithdraw: () => void;
  isWithdrawLoading: boolean;
}

export const UserProfile = ({
  user,
  onSettingsClick,
  onWithdraw,
  isWithdrawLoading,
}: UserProfileProps) => {
  if (!user) return null;
  const routeNavigator = useRouteNavigator();
  const getRoleText = () => {
    const roles = [];
    if (user.is_admin) roles.push("Администратор");
    if (user.is_expert) roles.push("Эксперт");
    if (roles.length === 0) return "Пользователь";
    return roles.join(" | ");
  };
  const isPending = user.status === "pending";
  const isApprovedExpert = user.is_expert && user.status === "approved";

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
                marginTop: "8px",
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
                  paddingTop: 8,
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
          {isApprovedExpert && user.topics && user.topics.length > 0 && (
            <Div>
              <Header>Направления</Header>
              {user.topics.map((topic) => (
                <SimpleCell key={topic} disabled multiline>
                  {topic}
                </SimpleCell>
              ))}
            </Div>
          )}
          {isApprovedExpert && (
            <Div
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              <Tooltip description="Экспертный рейтинг">
                <div
                  className="stat-item"
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Icon20CheckCircleFillGreen />
                  <Title level="3">{user.stats?.expert || 0}</Title>
                </div>
              </Tooltip>
              <Tooltip description="Народный рейтинг">
                <div
                  className="stat-item"
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Icon20FavoriteCircleFillYellow />
                  <Title level="3">{user.stats?.community || 0}</Title>
                </div>
              </Tooltip>
              <Tooltip description="Проведено мероприятий">
                <div
                  className="stat-item"
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Icon24ListBulletSquareOutline width={20} height={20} />
                  <Title level="3">{user.stats?.events_count || 0}</Title>
                </div>
              </Tooltip>
            </Div>
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
