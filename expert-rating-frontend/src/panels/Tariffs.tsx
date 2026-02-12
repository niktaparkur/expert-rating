import React from "react";
import {
  Panel,
  PanelHeader,
  Group,
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
  Placeholder,
  HorizontalScroll,
} from "@vkontakte/vkui";
import { Icon16HelpOutline, Icon24CheckCircleOn, Icon56ErrorTriangleOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useUserStore } from "../store/userStore";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../hooks/useApi";

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
  vk_donut_link: string | null;
}

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
      minWidth: 280,
      maxWidth: 320,
      margin: "0 auto",
    }}
  >
    <Div>
      <Title level="2" style={{ textAlign: "center" }}>{tariff.name}</Title>
    </Div>
    <Div>
      <Title level="1" style={{ marginBottom: 4, textAlign: "center" }}>
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
          mode={isCurrent ? "secondary" : "primary"}
          onClick={() => onSelect(tariff)}
          disabled={!isSelectable && !tariff.vk_donut_link}
          href={isSelectable && tariff.vk_donut_link ? tariff.vk_donut_link : undefined}
          target="_blank"
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
  const { apiGet } = useApi();

  const isDesktop = (viewWidth ?? 0) >= ViewWidth.TABLET;

  const { data: tariffs, isLoading, isError } = useQuery<Tariff[]>({
    queryKey: ["tariffs"],
    queryFn: () => apiGet("/tariffs"),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const handleRegister = () => routeNavigator.push("/registration");
  const getCurrentTariffName = () => user?.tariff_plan || "Начальный";

  const renderContent = () => {
    if (isLoading) return <Spinner size="xl" style={{ marginTop: 20 }} />;
    if (isError) return <Placeholder icon={<Icon56ErrorTriangleOutline />} title="Ошибка загрузки тарифов" />;

    const currentTariffName = getCurrentTariffName();

    // Sort logic handled by backend usually, but ensuring order by price here
    const sortedTariffs = tariffs?.sort((a, b) => a.price_votes - b.price_votes) || [];

    const tariffCards = sortedTariffs.map((tariff) => {
      // Logic: Show all tariffs.
      // If tariff is "Начальный" (price 0) and user is on it, show "Ваш тариф".
      // If tariff is paid, logic applies.

      const isCurrent = tariff.name === currentTariffName;
      let buttonText = "Выбрать (VK Donut)";
      let isSelectable = true;

      if (isCurrent) {
        buttonText = "Ваш текущий тариф";
        isSelectable = false;
      } else if (tariff.price_votes === 0) {
        // Free tariff, but not current? Means user is on paid.
        buttonText = "Бесплатный тариф";
        isSelectable = false; // Can't "switch" to free via button usually, cancel subscription instead
      } else {
        if (user?.is_expert) {
          // Upgrade/Downgrade logic handled by VK Donut link usually
          buttonText = "Перейти";
        } else {
          // Not expert yet
          if (tariff.price_votes > 0) {
            buttonText = "Будет доступен после регистрации";
            isSelectable = false;
            // Wait, can they buy before reg? Usually no.
          }
        }
      }

      // Override for non-experts for paid tariffs -> Disable
      if (!user?.is_expert && tariff.price_votes > 0) {
        isSelectable = false;
        buttonText = "Сначала станьте экспертом";
      }

      return (
        <TariffCardComponent
          key={tariff.id}
          tariff={tariff}
          isCurrent={isCurrent}
          user={user}
          onSelect={() => { }} // Handled by href in button
          onRegister={handleRegister}
          isSelectable={isSelectable}
          customButtonText={buttonText}
        />
      );
    });

    if (isDesktop) {
      return (
        <HorizontalScroll showArrows getScrollToLeft={(i: number) => i - 120} getScrollToRight={(i: number) => i + 120}>
          <div style={{ display: "flex", gap: 16, padding: "0 4px" }}>
            {tariffCards}
          </div>
        </HorizontalScroll>
      );
    }

    // Mobile view: Vertical list with gaps
    return (
      <Div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tariffCards}
      </Div>
    );
  };

  return (
    <Panel id={id}>
      <PanelHeader>Тарифы</PanelHeader>
      <Group>
        <Div>
          <Text style={{ marginBottom: 20, textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
            Оформите подписку VK Donut, чтобы получить доступ к расширенным возможностям и увеличить лимиты.
          </Text>
        </Div>
        {renderContent()}
      </Group>
    </Panel>
  );
};
