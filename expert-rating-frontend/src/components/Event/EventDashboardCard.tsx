// src/components/Event/EventDashboardCard.tsx
import React from "react";
import {
  Group,
  Header,
  Div,
  Button,
  SimpleCell,
  Headline,
  Text,
  Separator,
  InfoRow,
} from "@vkontakte/vkui";
import {
  Icon24CheckCircleOutline,
  Icon24ErrorCircleOutline,
  Icon24ClockOutline,
  Icon24CalendarOutline,
  Icon24TagOutline,
  Icon24UsersOutline,
} from "@vkontakte/icons";
import { EventData } from "../../types";

export interface EventDashboardCardProps {
  event: EventData;
  onShowQrClick?: (event: EventData) => void;
}

export const EventDashboardCard = ({
  event,
  onShowQrClick,
}: EventDashboardCardProps) => {
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

  const statusInfo = getStatusInfo(event.status);

  // Логика определения архива (если дата + длительность уже прошли)
  const eventEnd = new Date(
    new Date(event.event_date).getTime() + event.duration_minutes * 60000,
  );
  const isFinished = new Date() > eventEnd;

  return (
    <Group mode="card" header={<Header>{event.name}</Header>}>
      <SimpleCell before={statusInfo.icon} multiline disabled>
        <Headline
          weight="3"
          style={{ color: statusInfo.color }}
          useAccentWeight
        >
          {statusInfo.text}
        </Headline>
        {/* Показываем пометку Архив, если событие прошло и оно было одобрено */}
        {isFinished && event.status === "approved" && (
          <Text
            style={{ color: "var(--vkui--color_text_secondary)", fontSize: 12 }}
          >
            В архиве
          </Text>
        )}
        {event.status !== "rejected" && !isFinished && (
          <Text style={{ color: "var(--vkui--color_text_secondary)" }}>
            Статус
          </Text>
        )}
        {/* {event.status === 'rejected' && event.rejection_reason && (
             <Text style={{ color: "var(--vkui--color_text_negative)", fontSize: 13, marginTop: 4 }}>
                Причина: {event.rejection_reason}
             </Text>
        )} */}
      </SimpleCell>
      <Separator />
      <SimpleCell before={<Icon24CalendarOutline />} multiline disabled>
        <InfoRow header="Дата">
          {new Date(event.event_date).toLocaleString("ru-RU", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </InfoRow>
      </SimpleCell>
      <SimpleCell before={<Icon24TagOutline />} multiline disabled>
        <InfoRow header="Промо-слово">{event.promo_word}</InfoRow>
      </SimpleCell>
      {event.status === "approved" && (
        <SimpleCell before={<Icon24UsersOutline />} multiline disabled>
          <InfoRow header="Проголосовало">
            {event.votes_count} (👍{event.trust_count} / 👎
            {event.distrust_count})
          </InfoRow>
        </SimpleCell>
      )}
      {event.status === "approved" && onShowQrClick && (
        <>
          <Separator />
          <Div>
            <Button
              stretched
              size="l"
              mode="secondary"
              onClick={() => onShowQrClick(event)}
            >
              Показать QR-код
            </Button>
          </Div>
        </>
      )}
    </Group>
  );
};
