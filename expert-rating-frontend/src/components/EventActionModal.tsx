import React from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  RichCell,
  Avatar,
  Text,
  Div,
  Button,
  FormStatus,
  SimpleCell,
  InfoRow,
  Tooltip,
} from "@vkontakte/vkui";
import { Icon28CalendarOutline } from "@vkontakte/icons";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EventData } from "../types";

interface EventActionModalProps {
  id: string;
  event: EventData | null;
  onClose: () => void;
  onShare: () => void;
  onDelete: () => void;
  onStop: () => void;
  onShowQr: () => void;
}

const getStatusText = (status: "pending" | "approved" | "rejected") => {
  switch (status) {
    case "approved":
      return "Одобрено";
    case "pending":
      return "На модерации";
    case "rejected":
      return "Отклонено";
    default:
      return status;
  }
};

export const EventActionModal = ({
  id,
  event,
  onClose,
  onShare,
  onDelete,
  onStop,
  onShowQr,
}: EventActionModalProps) => {
  if (!event) return null;

  const isoDateString = event.event_date.endsWith("Z")
    ? event.event_date
    : event.event_date + "Z";
  const eventDate = new Date(isoDateString);
  const dateString = format(eventDate, "d MMMM yyyy, HH:mm", { locale: ru });

  const now = new Date();
  const eventStart = new Date(isoDateString);
  const eventEnd = new Date(
    eventStart.getTime() + event.duration_minutes * 60000,
  );

  const isFinished = now > eventEnd;
  const isStarted = now >= eventStart;
  const isLive = isStarted && !isFinished;

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={<ModalPageHeader>Действия</ModalPageHeader>}
      settlingHeight={100}
    >
      <Group>
        <RichCell
          before={<Icon28CalendarOutline />}
          overTitle={getStatusText(event.status)}
          disabled
        >
          <Text weight="1">{event.name}</Text>
        </RichCell>
        <SimpleCell multiline>
          <InfoRow header="Дата и время">{dateString}</InfoRow>
        </SimpleCell>
        <SimpleCell>
          <InfoRow header="Голоса">{`👍 ${event.trust_count} / 👎 ${event.distrust_count}`}</InfoRow>
        </SimpleCell>
        {event.has_tariff_warning && (
          <FormStatus title="Превышен лимит голосов" mode="error">
            Чтобы все голоса были учтены в рейтинге, пожалуйста, повысьте ваш
            тариф.
          </FormStatus>
        )}
      </Group>
      <Div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Button size="l" mode="secondary" stretched onClick={onShare}>
          Поделиться
        </Button>
        <Button size="l" mode="secondary" stretched onClick={onShowQr}>
          Показать QR-код
        </Button>
        {isLive ? (
          <Button size="l" appearance="negative" stretched onClick={onStop}>
            Остановить голосование
          </Button>
        ) : !isFinished ? (
          <Button size="l" appearance="negative" stretched onClick={onDelete}>
            Удалить
          </Button>
        ) : (
          <Tooltip description="Нельзя удалить или остановить завершенное мероприятие">
            <Button size="l" appearance="negative" stretched disabled>
              Удалить
            </Button>
          </Tooltip>
        )}
      </Div>
    </ModalPage>
  );
};
