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
}: EventActionModalProps) => {
  if (!event) {
    return null;
  }

  const isoDateString = event.event_date.endsWith("Z")
    ? event.event_date
    : event.event_date + "Z";
  const eventDate = new Date(isoDateString);
  const dateString = format(eventDate, "d MMMM yyyy, HH:mm", { locale: ru });
  const isFinished =
    new Date() > new Date(eventDate.getTime() + event.duration_minutes * 60000);

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={<ModalPageHeader>Действия</ModalPageHeader>}
      settlingHeight={100}
    >
      <Group>
        <RichCell
          before={
            <Avatar
              size={48}
              style={{
                background: "var(--vkCom--color_background_accent_themed)",
              }}
            >
              <Icon28CalendarOutline fill="var(--vkCom--color_icon_contrast)" />
            </Avatar>
          }
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
        {/* <Button size="l" mode="secondary" stretched>Поделиться QR-кодом</Button> */}

        {!isFinished && (
          <Button size="l" appearance="negative" stretched onClick={onDelete}>
            Удалить
          </Button>
        )}
      </Div>
    </ModalPage>
  );
};
