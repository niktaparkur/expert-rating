import React, { useState, useEffect, useCallback } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Input,
  Button,
  ScreenSpinner,
  Div,
  Textarea,
  Switch,
  ModalRoot,
  Placeholder,
  ButtonGroup,
  FormField,
  Header,
  SimpleCell,
  DateInput,
  ModalCard,
} from "@vkontakte/vkui";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useApi } from "../hooks/useApi";
import {
  Icon56CheckCircleOutline,
  Icon28NotificationWaves,
  Icon28ArrowUpRectangleSlashOutline,
} from "@vkontakte/icons";
import debounce from "lodash.debounce";
import { UserData } from "../types";

interface CreateEventProps {
  id: string;
  setPopout: (popout: React.ReactNode | null) => void;
  user: UserData | null;
}

export const CreateEvent = ({ id, setPopout, user }: CreateEventProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiPost, apiGet } = useApi();
  const [formData, setFormData] = useState({
    name: "",
    promo_word: "",
    event_date: null as Date | null,
    duration_minutes: "60",
    event_link: "",
    is_private: false,
    send_reminder: false,
    voter_thank_you_message: "",
  });
  const TARIFF_LIMITS = { Начальный: 60, Стандарт: 720, Профи: 1440 };
  const [promoStatus, setPromoStatus] = useState<
    "available" | "taken" | "error" | "invalid" | null
  >(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);
  const userTariff = user?.tariff_plan || "Начальный";
  const isAdmin = user?.is_admin || false;
  const canUseStandardOptions =
    userTariff === "Стандарт" || userTariff === "Профи" || isAdmin;
  const canUseProOptions = userTariff === "Профи" || isAdmin;
  const canUseAdminOptions = isAdmin;

  const checkPromo = useCallback(
    debounce(async (word: string) => {
      const normalizedWord = word.trim().toUpperCase();
      if (!/^[A-Z0-9]{4,}$/.test(normalizedWord)) {
        setPromoStatus(normalizedWord.length > 0 ? "invalid" : null);
        setIsCheckingPromo(false);
        return;
      }
      setIsCheckingPromo(true);
      try {
        const response = await apiGet(`/events/status/${normalizedWord}`);
        setPromoStatus(response.status === "not_found" ? "available" : "taken");
      } catch {
        setPromoStatus("error");
      } finally {
        setIsCheckingPromo(false);
      }
    }, 500),
    [apiGet],
  );

  useEffect(() => {
    checkPromo(formData.promo_word);
  }, [formData.promo_word, checkPromo]);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const checked = (e.target as HTMLInputElement).checked;
    if (name === "duration_minutes") {
      const durationValue = parseInt(value, 10);
      const maxDuration =
        TARIFF_LIMITS[userTariff as keyof typeof TARIFF_LIMITS] || 60;
      if (!isAdmin && durationValue > maxDuration)
        setDurationError(`Максимум для вашего тарифа: ${maxDuration} мин.`);
      else setDurationError(null);
    }
    setFormData((prev) => ({ ...prev, [name]: isCheckbox ? checked : value }));
  };
  const handleDateChange = (date: Date | null | undefined) =>
    setFormData((prev) => ({ ...prev, event_date: date || null }));
  const setDuration = (minutes: string) => {
    setDurationError(null);
    setFormData((prev) => ({ ...prev, duration_minutes: minutes }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || promoStatus !== "available" || !formData.event_date)
      return;
    setIsSubmitting(true);
    setPopout(<ScreenSpinner state="loading" />);
    const finalData = {
      ...formData,
      event_link:
        formData.event_link.trim() === "" ? null : formData.event_link,
      duration_minutes: parseInt(formData.duration_minutes),
      event_date: formData.event_date.toISOString(),
    };
    try {
      await apiPost("/events/create", finalData);
      setPopout(
        <ModalRoot activeModal="success-modal" onClose={() => setPopout(null)}>
          <ModalCard
            id="success-modal"
            onClose={() => {
              setPopout(null);
              routeNavigator.back();
            }}
            icon={
              <Icon56CheckCircleOutline
                style={{ color: "var(--vkui--color_icon_positive)" }}
              />
            }
            title="Мероприятие отправлено"
            description="Оно появится в вашем профиле после прохождения модерации."
            actions={
              <Button
                size="l"
                mode="primary"
                stretched
                onClick={() => {
                  setPopout(null);
                  routeNavigator.back();
                }}
              >
                Отлично
              </Button>
            }
          />
        </ModalRoot>,
      );
    } catch (error) {
      setPopout(null);
      alert(
        error instanceof Error ? error.message : "Произошла неизвестная ошибка",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPromoBottomText = () => {
    if (isCheckingPromo) return "Проверка...";
    if (promoStatus === "invalid")
      return "Минимум 4 символа, только латиница и цифры.";
    if (promoStatus === "taken") return "Это слово уже занято";
    if (promoStatus === "available") return "Слово свободно!";
    if (promoStatus === "error") return "Ошибка проверки";
    return "Уникальное слово для голосования.";
  };

  return (
    <Panel id={id}>
      <PanelHeader
        before={
          <PanelHeaderBack
            onClick={() => !isSubmitting && routeNavigator.back()}
          />
        }
      >
        Новое мероприятие
      </PanelHeader>
      <Group>
        <form onSubmit={handleSubmit}>
          <FormItem
            top="Название мероприятия"
            required
            bottom={`${formData.name.length} / 128`}
          >
            <FormField>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={128}
              />
            </FormField>
          </FormItem>
          <FormItem
            top="Промо-слово"
            required
            bottom={getPromoBottomText()}
            status={
              promoStatus === "taken" || promoStatus === "invalid"
                ? "error"
                : "default"
            }
          >
            <FormField>
              <Input
                name="promo_word"
                value={formData.promo_word}
                onChange={handleChange}
              />
            </FormField>
          </FormItem>
          <FormItem top="Ссылка на мероприятие (необязательно)">
            <FormField>
              <Input
                name="event_link"
                type="url"
                value={formData.event_link}
                onChange={handleChange}
                placeholder="https://vk.com/event123"
              />
            </FormField>
          </FormItem>
          <FormItem top="Дата и время начала" required>
            <DateInput
              value={formData.event_date}
              onChange={handleDateChange}
              enableTime
              disablePast
              closeOnChange
              accessible
            />
          </FormItem>
          <FormItem
            top="Длительность голосования (в минутах)"
            status={durationError ? "error" : "default"}
            bottom={durationError}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <FormField style={{ flexGrow: 0 }}>
                <Input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                />
              </FormField>
            </div>
            <ButtonGroup mode="horizontal" gap="s" style={{ marginTop: 8 }}>
              <Button
                size="m"
                mode="outline"
                appearance="neutral"
                onClick={() => setDuration("30")}
              >
                30 мин
              </Button>
              <Button
                size="m"
                mode="outline"
                appearance="neutral"
                onClick={() => setDuration("60")}
              >
                1 час
              </Button>
              {canUseStandardOptions && (
                <>
                  <Button
                    size="m"
                    mode="outline"
                    appearance="neutral"
                    onClick={() => setDuration("120")}
                  >
                    2 часа
                  </Button>
                  <Button
                    size="m"
                    mode="outline"
                    appearance="neutral"
                    onClick={() => setDuration("360")}
                  >
                    6 часов
                  </Button>
                  <Button
                    size="m"
                    mode="outline"
                    appearance="neutral"
                    onClick={() => setDuration("720")}
                  >
                    12 часов
                  </Button>
                </>
              )}
              {canUseProOptions && (
                <Button
                  size="m"
                  mode="outline"
                  appearance="neutral"
                  onClick={() => setDuration("1440")}
                >
                  24 часа
                </Button>
              )}
              {canUseAdminOptions && (
                <Button
                  size="m"
                  mode="outline"
                  appearance="neutral"
                  onClick={() => setDuration("4320")}
                >
                  72 часа
                </Button>
              )}
            </ButtonGroup>
          </FormItem>
          <Header>Дополнительные настройки</Header>
          <FormItem
            top="Сообщение проголосовавшим (необязательно)"
            bottom={`${formData.voter_thank_you_message.length} / 200`}
          >
            <FormField>
              <Textarea
                name="voter_thank_you_message"
                value={formData.voter_thank_you_message}
                onChange={handleChange}
                maxLength={200}
                placeholder="Спасибо за ваш голос! Вот ваш промокод на скидку..."
              />
            </FormField>
          </FormItem>
          <SimpleCell
            Component="label"
            before={<Icon28ArrowUpRectangleSlashOutline />}
            after={
              <Switch
                name="is_private"
                checked={formData.is_private}
                onChange={handleChange}
              />
            }
            subtitle="Событие не будет отображаться в общей ленте 'Афиша'"
          >
            Закрытое мероприятие
          </SimpleCell>
          <SimpleCell
            Component="label"
            before={<Icon28NotificationWaves />}
            after={
              <Switch
                name="send_reminder"
                checked={formData.send_reminder}
                onChange={handleChange}
              />
            }
            subtitle="Вы получите уведомление за 15 минут до начала голосования"
          >
            Напомнить о начале
          </SimpleCell>
          <Div>
            <Button
              size="l"
              stretched
              type="submit"
              disabled={
                isSubmitting ||
                !formData.event_date ||
                promoStatus !== "available" ||
                !!durationError
              }
            >
              Отправить на модерацию
            </Button>
          </Div>
        </form>
      </Group>
    </Panel>
  );
};
