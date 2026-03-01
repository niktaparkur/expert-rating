import React, { useState } from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  Div,
  Button,
  SimpleCell,
  Headline,
  Text,
  Separator,
  InfoRow,
  PanelHeaderButton,
  Header,
  Spinner,
  Snackbar,
} from "@vkontakte/vkui";
import {
  Icon24CheckCircleOutline,
  Icon24ErrorCircleOutline,
  Icon24ClockOutline,
  Icon24CalendarOutline,
  Icon24TagOutline,
  Icon24UsersOutline,
  Icon24Qr,
  Icon28CancelOutline,
  Icon24Dismiss,
  Icon24Document,
  Icon28CheckCircleFill,
  Icon16Cancel,
} from "@vkontakte/icons";
import { EventData } from "../../types";
import { useUserStore } from "../../store/userStore";
import { useApi } from "../../hooks/useApi";
import { useUiStore } from "../../store/uiStore";

interface EventActionModalProps {
  id: string;
  event: EventData | null;
  onClose: () => void;
  onDelete: () => void;
  onStop: () => void;
  onShowQr: () => void;
}

export const EventActionModal = ({
  id,
  event,
  onClose,
  onDelete,
  onStop,
  onShowQr,
}: EventActionModalProps) => {
  const { currentUser } = useUserStore();
  const { apiPost } = useApi();
  const { setSnackbar, setPopout } = useUiStore();

  if (!event) return null;

  const handleDownloadReport = async () => {
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/events/admin/${event.id}/report`, {});
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={
            <Icon28CheckCircleFill fill="var(--vkui--color_icon_positive)" />
          }
        >
          Отчет отправлен вам в личные сообщения ВК
        </Snackbar>,
      );
    } catch (e: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {e.message || "Ошибка заказа отчета"}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const getStatusInfo = (status: EventData["status"]) => {
    if (status === "pending")
      return {
        icon: <Icon24ClockOutline fill="var(--vkui--color_icon_accent)" />,
        text: "На модерации",
        color: "var(--vkui--color_text_accent)",
      };
    if (status === "approved")
      return {
        icon: (
          <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />
        ),
        text: "Одобрено",
        color: "var(--vkui--color_text_positive)",
      };
    if (status === "rejected")
      return {
        icon: (
          <Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />
        ),
        text: "Отклонено",
        color: "var(--vkui--color_text_negative)",
      };
    return { icon: null, text: status, color: "inherit" };
  };

  const isoDateString = event.event_date.endsWith("Z")
    ? event.event_date
    : event.event_date + "Z";
  const eventStart = new Date(isoDateString);
  const eventEnd = new Date(
    eventStart.getTime() + event.duration_minutes * 60000,
  );
  const now = new Date();

  const isLive = now >= eventStart && now <= eventEnd;
  const isFinished = now > eventEnd;
  const isApproved = event.status === "approved";
  const isAdmin = currentUser?.is_admin;

  const statusInfo = getStatusInfo(event.status);

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader
          after={
            <PanelHeaderButton onClick={onClose}>
              <Icon24Dismiss />
            </PanelHeaderButton>
          }
        >
          Управление событием
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <div style={{ padding: "12px 16px 4px" }}>
          <Headline weight="1" style={{ wordBreak: "break-word" }}>
            {event.name}
          </Headline>
        </div>

        <SimpleCell before={statusInfo.icon} multiline disabled>
          <Headline
            weight="3"
            style={{ color: statusInfo.color }}
            useAccentWeight
          >
            {statusInfo.text}
          </Headline>
          {isFinished && isApproved && (
            <Text
              style={{
                color: "var(--vkui--color_text_secondary)",
                fontSize: 12,
              }}
            >
              В архиве
            </Text>
          )}
          {isLive && isApproved && (
            <Text
              style={{
                color: "var(--vkui--color_text_positive)",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              Идет сейчас (Live)
            </Text>
          )}
        </SimpleCell>

        <Separator />

        <SimpleCell before={<Icon24CalendarOutline />} multiline>
          <InfoRow header="Дата">
            {eventStart.toLocaleString("ru-RU", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </InfoRow>
        </SimpleCell>

        <SimpleCell before={<Icon24TagOutline />} multiline>
          <InfoRow header="Промо-слово">{event.promo_word}</InfoRow>
        </SimpleCell>

        {isApproved && (
          <SimpleCell before={<Icon24UsersOutline />} multiline>
            <InfoRow header="Проголосовало">
              {event.votes_count} (👍{event.trust_count} / 👎
              {event.distrust_count})
            </InfoRow>
          </SimpleCell>
        )}
      </Group>

      {event.description && (
        <Group header={<Header>Описание</Header>}>
          <Div>
            <Text style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {event.description}
            </Text>
          </Div>
        </Group>
      )}

      <Group>
        <Div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isAdmin && isFinished && (
            <Button
              size="l"
              mode="primary"
              stretched
              before={<Icon24Document />}
              onClick={handleDownloadReport}
            >
              Скачать отчет (.xlsx)
            </Button>
          )}

          {isApproved && (
            <Button
              size="l"
              mode="secondary"
              stretched
              before={<Icon24Qr />}
              onClick={onShowQr}
            >
              Показать QR-код
            </Button>
          )}

          {isLive && isApproved ? (
            <Button
              size="l"
              appearance="negative"
              mode="outline"
              stretched
              before={<Icon28CancelOutline width={24} height={24} />}
              onClick={onStop}
            >
              Остановить голосование
            </Button>
          ) : (
            (event.status === "rejected" ||
              event.status === "pending" ||
              (isApproved && !isFinished)) && (
              <Button
                size="l"
                appearance="negative"
                mode="outline"
                stretched
                before={<Icon24Dismiss />}
                onClick={onDelete}
              >
                Удалить мероприятие
              </Button>
            )
          )}
        </Div>
      </Group>
    </ModalPage>
  );
};
