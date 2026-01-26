import React, { useEffect, useState } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  CardScroll,
  Div,
  Text,
  Button,
  Title,
  SimpleCell,
  Card,
  useAdaptivity,
  ViewWidth,
  CardGrid,
  Tooltip,
  Spinner,
} from "@vkontakte/vkui";
import { Icon16HelpOutline, Icon24CheckCircleOn } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useUserStore } from "../store/userStore";
import { UserData } from "../types";

interface TariffFeature {
  text: string;
  tooltip: string;
}

interface Tariff {
  id: string;
  name: string;
  price_str: string;
  price_votes: number;
  features: TariffFeature[];
  feature_headers: string[];
}

const TARIFF_LEVELS: { [key: string]: number } = {
  Начальный: 0,
  Стандарт: 1,
  Профи: 2,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const tariffsData: Tariff[] = [
  {
    id: "tariff_start",
    name: "Начальный",
    price_str: "Бесплатно",
    price_votes: 0,
    features: [
      {
        text: "до 1 часа",
        tooltip:
          "Сколько времени действует слово для голосования с момента начала мероприятия.",
      },
      // {
      //   text: "1 рассылка в месяц",
      //   tooltip:
      //     "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      // },
      {
        text: "3 мероприятия в месяц",
        tooltip:
          "Количество слов для голосования, которые может создать эксперт. Слово считается использованным после одобрения модератором.",
      },
      {
        text: "100 голосов на мероприятии",
        tooltip:
          "Сколько новых голосов может получить эксперт на одно мероприятие. Ранее голосовавшие пользователи не учитываются в лимите.",
      },
      // {
      //   text: "2 отклика на оплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где указан гонорар.",
      // },
      // {
      //   text: "10 откликов на неоплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где участие не оплачивается.",
      // },
    ],
    feature_headers: [
      "Срок активности слова",
      "Рассылки в месяц",
      "Мероприятия в месяц",
      "Голосов на мероприятии",
      "Платные отклики",
      "Бесплатные отклики",
    ],
  },
  {
    id: "tariff_standard",
    name: "Стандарт",
    price_str: "999 ₽",
    price_votes: 999,
    features: [
      {
        text: "до 12 часов",
        tooltip:
          "Сколько времени действует слово для голосования с момента начала мероприятия.",
      },
      // {
      //   text: "2 рассылки в месяц",
      //   tooltip:
      //     "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      // },
      {
        text: "10 мероприятий в месяц",
        tooltip:
          "Количество слов для голосования, которые может создать эксперт. Слово считается использованным после одобрения модератором.",
      },
      {
        text: "200 голосов на мероприятии",
        tooltip:
          "Сколько новых голосов может получить эксперт на одно мероприятие. Ранее голосовавшие пользователи не учитываются в лимите.",
      },
      // {
      //   text: "7 откликов на оплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где указан гонорар.",
      // },
      // {
      //   text: "20 откликов на неоплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где участие не оплачивается.",
      // },
    ],
    feature_headers: [
      "Срок активности слова",
      "Рассылки в месяц",
      "Мероприятия в месяц",
      "Голосов на мероприятии",
      "Платные отклики",
      "Бесплатные отклики",
    ],
  },
  {
    id: "tariff_pro",
    name: "Профи",
    price_str: "3999 ₽",
    price_votes: 3999,
    features: [
      {
        text: "до 24 часов",
        tooltip:
          "Сколько времени действует слово для голосования с момента начала мероприятия.",
      },
      // {
      //   text: "4 рассылки в месяц",
      //   tooltip:
      //     "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      // },
      {
        text: "30 мероприятий в месяц",
        tooltip:
          "Количество слов для голосования, которые может создать эксперт. Слово считается использованным после одобрения модератором.",
      },
      {
        text: "1000 голосов на мероприятии",
        tooltip:
          "Сколько новых голосов может получить эксперт на одно мероприятие. Ранее голосовавшие пользователи не учитываются в лимите.",
      },
      // {
      //   text: "15 откликов на оплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где указан гонорар.",
      // },
      // {
      //   text: "40 откликов на неоплачиваемые мероприятия",
      //   tooltip:
      //     "Сколько раз эксперт может откликнуться на запросы от организаторов, где участие не оплачивается.",
      // },
    ],
    feature_headers: [
      "Срок активности слова",
      "Рассылки в месяц",
      "Мероприятия в месяц",
      "Голосов на мероприятии",
      "Платные отклики",
      "Бесплатные отклики",
    ],
  },
];

const getExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const TariffCardComponent = ({
  tariff,
  isCurrent,
  user,
  onSelect,
  onRegister,
  isSelectable,
  customButtonText,
}: any) => (
  <Card
    mode="outline"
    style={{
      borderColor: isCurrent
        ? "var(--vkui--color_background_accent)"
        : undefined,
    }}
  >
    <Div>
      <Title level="2">{tariff.name}</Title>
    </Div>
    <Div>
      <Title level="1" style={{ marginBottom: 4 }}>
        {tariff.price_str}
      </Title>
    </Div>
    <Group mode="plain">
      {tariff.features.map((feature: TariffFeature, index: number) => (
        <SimpleCell
          key={feature.text}
          multiline
          before={
            <Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />
          }
          subtitle={tariff.feature_headers[index]}
          disabled
          after={
            feature.tooltip && (
              <Tooltip description={feature.tooltip} placement="top-start">
                <Icon16HelpOutline
                  style={{
                    color: "var(--vkui--color_icon_secondary)",
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            )
          }
        >
          {feature.text}
        </SimpleCell>
      ))}
    </Group>
    <Div>
      {!user?.is_expert && user?.status !== "pending" && !isCurrent ? (
        <Button size="l" stretched mode="primary" onClick={onRegister}>
          Стать экспертом
        </Button>
      ) : user?.status === "pending" && !isCurrent ? (
        <Button size="l" stretched disabled>
          Заявка на рассмотрении
        </Button>
      ) : (
        <Button
          size="l"
          stretched
          mode="primary"
          onClick={() => onSelect(tariff)}
          disabled={!isSelectable}
        >
          {customButtonText || "Выбрать (VK Donut)"}
        </Button>
      )}
    </Div>
  </Card>
);

interface TariffsProps {
  id: string;
}

export const Tariffs = ({ id }: TariffsProps) => {
  const routeNavigator = useRouteNavigator();
  const { viewWidth } = useAdaptivity();
  const { currentUser: user } = useUserStore();

  const isDesktop = (viewWidth ?? 0) >= ViewWidth.TABLET;
  const isLoading = !user;

  // TODO: Replace with actual VK Donut link
  const VK_DONUT_LINK = "https://vk.com/donut/expert_rating";

  const handleOpenDonut = () => {
    window.open(VK_DONUT_LINK, "_blank");
  };

  const handleRegister = () => routeNavigator.push("/registration");
  const getCurrentTariffName = () => user?.tariff_plan || "Начальный";

  const renderContent = () => {
    if (isLoading) return <Spinner size="xl" />;

    const currentTariffName = getCurrentTariffName();
    const currentUserLevel = TARIFF_LEVELS[currentTariffName] ?? 0;

    const tariffCards = tariffsData.map((tariff) => {
      // Skip "Начальный" if we only want to show upgrades
      // But let's show all for now, just changing the action.

      const tariffLevel = TARIFF_LEVELS[tariff.name];
      if (tariffLevel === 0) return null;

      // If this is the current paid tariff (matched by name)
      // Note: non-experts will have "Начальный" as currentTariffName usually, 
      // unless backend mapping is fixed. 
      // If user has subscription, we want to highlight that specific level.
      // But we don't have subscription info directly here except via user object props?
      // Wait, 'user' object has 'tariff_plan' which comes from backend.
      // If backend says "Standard" (even if not expert), then currentTariffName is "Standard".

      const isCurrentPaid = tariff.name === currentTariffName;

      let buttonText = "Выбрать (VK Donut)";
      let isDisabled = false;
      let onSelectAction = handleOpenDonut;
      let mode = "primary";

      if (isCurrentPaid) {
        isDisabled = true;
        mode = "secondary"; // or outline? user said "not clickable"
        if (user?.is_expert) {
          buttonText = "Ваш тариф";
        } else {
          buttonText = "Будет доступен после регистрации";
        }
      }

      return (
        <TariffCardComponent
          key={tariff.id}
          tariff={tariff}
          isCurrent={isCurrentPaid}
          user={user}
          onSelect={onSelectAction}
          onRegister={handleRegister}
          isSelectable={!isDisabled}
          customButtonText={buttonText}
        />
      );
    });

    if (isDesktop)
      return (
        <CardScroll size="s" padding>
          {tariffCards}
        </CardScroll>
      );
    return (
      <CardGrid size="l" style={{ padding: 0 }}>
        {tariffCards}
      </CardGrid>
    );
  };

  return (
    <Panel id={id}>
      <PanelHeader>Тарифы</PanelHeader>
      <Group>
        <Div>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            Оформите подписку VK Donut, чтобы получить доступ к расширенным возможностям.
          </Text>
        </Div>
        {renderContent()}
      </Group>
    </Panel>
  );
};
