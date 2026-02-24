import React, { useState } from "react";
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
  Tooltip,
  Spinner,
  Placeholder,
  ModalRoot,
  HorizontalScroll,
} from "@vkontakte/vkui";
import {
  Icon16HelpOutline,
  Icon24CheckCircleOn,
  Icon56ErrorTriangleOutline,
} from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../hooks/useApi";
import { TariffActionModal } from "../components/Shared/TariffActionModal";

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
  isDesktop,
}: any) => (
  <Card
    mode="outline"
    style={{
      borderColor: isCurrent
        ? "var(--vkui--color_background_accent)"
        : undefined,
      width: isDesktop ? 300 : "100%",
      minWidth: isDesktop ? 300 : "auto",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Div>
      <Title level="2" style={{ textAlign: "center" }}>
        {tariff.name}
      </Title>
    </Div>
    <Div>
      <Title level="1" style={{ marginBottom: 4, textAlign: "center" }}>
        {tariff.price_str}
      </Title>
    </Div>
    <Group mode="plain" style={{ flexGrow: 1 }}>
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
    <Div style={{ marginTop: "auto" }}>
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
        >
          {customButtonText || "Выбрать"}
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

  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

  const {
    data: tariffs,
    isLoading,
    isError,
  } = useQuery<Tariff[]>({
    queryKey: ["tariffs"],
    queryFn: () => apiGet("/tariffs"),
    staleTime: 1000 * 60 * 60,
  });

  const handleRegister = () => routeNavigator.push("/registration");
  const getCurrentTariffName = () => user?.tariff_plan || "Начальный";

  const { activeModal, setActiveModal, setSelectedTariffForModal } =
    useUiStore();

  const handleSelectTariff = (tariff: Tariff) => {
    setSelectedTariffForModal(tariff);
    setActiveModal("tariff-action-modal");
  };

  const renderContent = () => {
    if (isLoading) return <Spinner size="xl" style={{ marginTop: 20 }} />;
    if (isError)
      return (
        <Placeholder
          icon={<Icon56ErrorTriangleOutline />}
          title="Ошибка загрузки тарифов"
        />
      );

    const currentTariffName = getCurrentTariffName();
    const sortedTariffs =
      tariffs?.sort((a, b) => a.price_votes - b.price_votes) || [];

    const tariffCards = sortedTariffs.map((tariff) => {
      const isCurrent = tariff.name === currentTariffName;
      let buttonText = "Выбрать";
      let isSelectable = true;

      if (isCurrent) {
        buttonText = "Ваш текущий тариф";
        isSelectable = false;
      } else if (tariff.price_votes === 0) {
        buttonText = "Бесплатный тариф";
        isSelectable = false;
      } else {
        if (user?.is_expert) {
          buttonText = "Выбрать";
        } else {
          if (tariff.price_votes > 0) {
            buttonText = "Будет доступен после регистрации";
            isSelectable = false;
          }
        }
      }

      if (!user?.is_expert && tariff.price_votes > 0) {
        isSelectable = false;
        buttonText = "Сначала станьте экспертом";
      }

      return (
        <TariffCardComponent
          key={tariff.id}
          tariff={tariff}
          isCurrent={tariff.name === currentTariffName}
          user={user}
          onSelect={handleSelectTariff}
          onRegister={handleRegister}
          isSelectable={true}
          customButtonText={buttonText}
          isDesktop={isDesktop}
        />
      );
    });

    if (isDesktop) {
      return (
        <HorizontalScroll
          showArrows
          getScrollToLeft={(i: number) => i - 320}
          getScrollToRight={(i: number) => i + 320}
        >
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "8px 12px",
              justifyContent:
                sortedTariffs.length < 3 ? "center" : "flex-start",
            }}
          >
            {tariffCards}
          </div>
        </HorizontalScroll>
      );
    }

    return (
      <Div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tariffCards}
      </Div>
    );
  };

  return (
    <Panel id={id}>
      <PanelHeader>Тарифы</PanelHeader>
      <Group>
        <Div>
          <Text
            style={{
              marginBottom: 20,
              textAlign: "center",
              color: "var(--vkui--color_text_secondary)",
            }}
          >
            Выберите подходящий тариф...
          </Text>
        </Div>
        {renderContent()}
      </Group>
    </Panel>
  );
};
