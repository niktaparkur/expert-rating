import React, { useState } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  CardScroll,
  Div,
  Text,
  Button,
  Header,
  Title,
  SimpleCell,
  Card,
  useAdaptivity,
  ViewWidth,
  CardGrid,
  Tooltip,
  ScreenSpinner,
  Snackbar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FixedLayout,
  FormItem,
  Input,
  Spinner,
  FormField,
} from "@vkontakte/vkui";
import {
  Icon16HelpOutline,
  Icon16Done,
  Icon16Cancel,
  Icon24CheckCircleOn,
} from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import bridge from "@vkontakte/vk-bridge";
import { useApi } from "../hooks/useApi";
import { UserData } from "../types";

interface Tariff {
  id: string;
  name: string;
  price_str: string;
  price_votes: number;
  features: { text: string; tooltip?: string }[];
}

const TARIFF_LEVELS: { [key: string]: number } = {
  Начальный: 0,
  Стандарт: 1,
  Профи: 2,
};
const tariffsData: Tariff[] = [
  {
    id: "tariff_start",
    name: "Начальный",
    price_str: "Бесплатно",
    price_votes: 0,
    features: [
      { text: "До 3 мероприятий в месяц" },
      { text: "До 100 голосов на мероприятии" },
      { text: "До 1 часа длительность голосования" },
    ],
  },
  {
    id: "tariff_standard",
    name: "Стандарт",
    price_str: "299 голосов",
    price_votes: 299,
    features: [
      { text: "До 10 мероприятий в месяц" },
      { text: "До 200 голосов" },
      { text: "До 12 часов длительность голосования" },
      { text: "2 рассылки в месяц" },
    ],
  },
  {
    id: "tariff_pro",
    name: "Профи",
    price_str: "729 голосов",
    price_votes: 729,
    features: [
      { text: "До 30 мероприятий в месяц" },
      { text: "До 1000 голосов" },
      { text: "До 24 часов длительность голосования" },
      { text: "4 рассылки в месяц" },
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
      {tariff.price_votes > 0 && (
        <Text style={{ color: "var(--vkui--color_text_secondary)" }}>
          / 30 дней (до {getExpiryDate()})
        </Text>
      )}
    </Div>
    <Group mode="plain">
      {tariff.features.map((feature: any) => (
        <SimpleCell
          key={feature.text}
          before={
            <Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />
          }
          disabled
          after={
            feature.tooltip && (
              <Tooltip description={feature.tooltip} placement="top">
                <Icon16HelpOutline
                  style={{ color: "var(--vkui--color_icon_secondary)" }}
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
      {!user?.is_expert && user?.status !== "pending" ? (
        <Button size="l" stretched mode="primary" onClick={onRegister}>
          Стать экспертом
        </Button>
      ) : user?.status === "pending" ? (
        <Button size="l" stretched disabled>
          Заявка на рассмотрении
        </Button>
      ) : isCurrent ? (
        <Button size="l" stretched disabled>
          Ваш тариф
        </Button>
      ) : (
        <Button
          size="l"
          stretched
          mode="primary"
          onClick={() => onSelect(tariff)}
          disabled={!isSelectable}
        >
          Выбрать
        </Button>
      )}
    </Div>
  </Card>
);

export const Tariffs = ({
  id,
  user,
  setPopout,
  setSnackbar,
  refetchUser,
}: {
  id: string;
  user: UserData | null;
  setPopout: (popout: React.ReactNode | null) => void;
  setSnackbar: (snackbar: React.ReactNode | null) => void;
  refetchUser: () => void;
}) => {
  const routeNavigator = useRouteNavigator();
  const { viewWidth } = useAdaptivity();
  const { apiPost } = useApi();
  const isDesktop = viewWidth >= ViewWidth.TABLET;
  const loading = !user;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<any | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const openPromoModal = (tariff: Tariff) => {
    setSelectedTariff(tariff);
    setPromoCode("");
    setPromoResult(null);
    setActiveModal("promo-modal");
  };

  const handleApplyPromo = async () => {
    if (!promoCode || !selectedTariff || !user) return;
    setIsApplyingPromo(true);
    try {
      const result = await apiPost("/promo/apply", {
        code: promoCode,
        tariff_id: selectedTariff.id,
        user_vk_id: user.vk_id,
      });
      setPromoResult(result);
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(error as Error).message}
        </Snackbar>,
      );
      setPromoResult(null);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedTariff) return;
    setActiveModal(null);
    setPopout(<ScreenSpinner state="loading" />);
    const finalPrice = promoResult
      ? promoResult.final_price
      : selectedTariff.price_votes;
    const orderParams = {
      type: "item",
      item: selectedTariff.id,
      item_price: finalPrice,
    };
    try {
      await bridge.send("VKWebAppShowOrderBox", orderParams);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          После успешной оплаты ваш тариф будет обновлен.
        </Snackbar>,
      );
    } catch (error: any) {
      if (error.error_data?.error_code !== 4) {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
            Ошибка окна покупки.
          </Snackbar>,
        );
      }
    } finally {
      setPopout(null);
    }
  };

  const handleRegister = () => routeNavigator.push("/registration");
  const getCurrentTariffName = () => user?.tariff_plan || "Начальный";

  const renderContent = () => {
    if (loading) return <ScreenSpinner />;
    const currentTariffName = getCurrentTariffName();
    const currentUserLevel = TARIFF_LEVELS[currentTariffName] ?? 0;
    const tariffCards = tariffsData.map((tariff) => {
      const tariffLevel = TARIFF_LEVELS[tariff.name];
      return (
        <TariffCardComponent
          key={tariff.id}
          tariff={tariff}
          isCurrent={tariff.name === currentTariffName}
          user={user}
          onSelect={openPromoModal}
          onRegister={handleRegister}
          isSelectable={tariffLevel > currentUserLevel}
        />
      );
    });
    if (isDesktop) return <CardScroll size="s">{tariffCards}</CardScroll>;
    return (
      <CardGrid size="l" style={{ padding: 0 }}>
        {tariffCards}
      </CardGrid>
    );
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="promo-modal"
        onClose={() => setActiveModal(null)}
        header={
          <ModalPageHeader>Тариф "{selectedTariff?.name}"</ModalPageHeader>
        }
        settlingHeight={100}
      >
        <Group>
          <FormItem top="Промокод (если есть)">
            <FormField
              after={
                <Button onClick={handleApplyPromo} disabled={isApplyingPromo}>
                  {isApplyingPromo ? <Spinner size="s" /> : "Применить"}
                </Button>
              }
            >
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </FormField>
          </FormItem>
          {promoResult && (
            <SimpleCell disabled>
              Скидка {promoResult.discount_percent}% применена!
            </SimpleCell>
          )}
        </Group>

        <FixedLayout vertical="bottom" filled>
          <Div>
            <Button size="l" stretched onClick={handleInitiatePayment}>
              {`Оплатить ${promoResult ? promoResult.final_price : selectedTariff?.price_votes} голосов`}
            </Button>
          </Div>
        </FixedLayout>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader>Тарифы</PanelHeader>
      <Group>{renderContent()}</Group>
    </Panel>
  );
};
