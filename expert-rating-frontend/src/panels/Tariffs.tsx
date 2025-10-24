import React, { useState } from "react";
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
  Snackbar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Input,
  Spinner,
  FormLayoutGroup,
  PanelHeaderBack,
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
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";

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
      {
        text: "1 рассылка в месяц",
        tooltip:
          "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      },
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
    ],
    feature_headers: [
      "Срок активности слова",
      "Бесплатная рассылка",
      "Кол-во мероприятий в месяц",
      "Голосов на мероприятии",
    ],
  },
  {
    id: "tariff_standard",
    name: "Стандарт",
    price_str: "299 голосов",
    price_votes: 299,
    features: [
      {
        text: "до 12 часов",
        tooltip:
          "Сколько времени действует слово для голосования с момента начала мероприятия.",
      },
      {
        text: "2 рассылки в месяц",
        tooltip:
          "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      },
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
    ],
    feature_headers: [
      "Срок активности слова",
      "Бесплатная рассылка",
      "Кол-во мероприятий в месяц",
      "Голосов на мероприятии",
    ],
  },
  {
    id: "tariff_pro",
    name: "Профи",
    price_str: "729 голосов",
    price_votes: 729,
    features: [
      {
        text: "до 24 часов",
        tooltip:
          "Сколько времени действует слово для голосования с момента начала мероприятия.",
      },
      {
        text: "4 рассылки в месяц",
        tooltip:
          "Эксперт может сделать рассылку по своей аудитории, которая голосовала за него 'Доверяю'.",
      },
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
    ],
    feature_headers: [
      "Срок активности слова",
      "Бесплатная рассылка",
      "Кол-во мероприятий в месяц",
      "Голосов на мероприятии",
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

interface TariffsProps {
  id: string;
}

export const Tariffs = ({ id }: TariffsProps) => {
  const routeNavigator = useRouteNavigator();
  const { viewWidth } = useAdaptivity();
  const { apiPost } = useApi();
  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar } = useUiStore();

  const isDesktop = viewWidth >= ViewWidth.TABLET;
  const isLoading = !user;

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
    setPopout(<Spinner size="xl" />);
    const finalPrice = promoResult
      ? promoResult.final_price
      : selectedTariff.price_votes;

    const orderParams = {
      type: "item",
      item: selectedTariff.id,
      item_price: finalPrice,
    };
    try {
      await bridge.send("VKWebAppShowOrderBox", orderParams as any);
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
    if (isLoading) return <Spinner size="xl" />;
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
    if (isDesktop)
      return (
        <CardScroll size="s" padding padding>
          {tariffCards}
        </CardScroll>
      );
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
          <ModalPageHeader
            before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}
          >
            Тариф "{selectedTariff?.name}"
          </ModalPageHeader>
        }
        settlingHeight={100}
      >
        <Group>
          <Group>
            <FormLayoutGroup
              mode="horizontal"
              style={{ alignItems: "flex-end", padding: "0 16px" }}
            >
              <FormItem top="Промокод (если есть)" style={{ flexGrow: 1 }}>
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </FormItem>
              <FormItem>
                <Button onClick={handleApplyPromo} disabled={isApplyingPromo}>
                  {isApplyingPromo ? <Spinner size="s" /> : "Применить"}
                </Button>
              </FormItem>
            </FormLayoutGroup>
            {promoResult && (
              <SimpleCell disabled>
                Скидка {promoResult.discount_percent}% применена!
              </SimpleCell>
            )}
          </Group>
          {promoResult && (
            <SimpleCell disabled>
              Скидка {promoResult.discount_percent}% применена!
            </SimpleCell>
          )}
        </Group>
        <Div>
          <Button
            size="l"
            stretched
            onClick={handleInitiatePayment}
          >{`Оплатить ${promoResult ? promoResult.final_price : selectedTariff?.price_votes} голосов`}</Button>
        </Div>
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
