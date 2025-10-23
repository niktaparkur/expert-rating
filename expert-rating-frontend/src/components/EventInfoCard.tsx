import React from "react";
import { Footnote, SimpleCell, Text, Tooltip, Badge, IconButton } from "@vkontakte/vkui";
import {
  Icon24InfoCircleOutline,
  Icon28CalendarOutline,
} from "@vkontakte/icons";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import "./EventInfoCard.css";
import { EventData } from "../types";

interface EventInfoCardProps {
  event: EventData;
  onClick?: (event: EventData) => void;
}

export const EventInfoCard = ({ event, onClick }: EventInfoCardProps) => {
  const isoDateString = event.event_date.endsWith("Z")
    ? event.event_date
    : event.event_date + "Z";
  const eventDate = new Date(isoDateString);
  const endDate = new Date(
    eventDate.getTime() + event.duration_minutes * 60000,
  );

  let subtitleString: string;
  if (isSameDay(eventDate, endDate)) {
    const timeString = `${format(eventDate, "HH:mm")} — ${format(endDate, "HH:mm")}`;
    const dateString = format(eventDate, "d MMMM", { locale: ru });
    subtitleString = `${timeString}, ${dateString}`;
  } else {
    const startString = format(eventDate, "HH:mm, d MMMM", { locale: ru });
    const endString = format(endDate, "HH:mm, d MMMM", { locale: ru });
    subtitleString = `${startString} — ${endString}`;
  }

  const isEventLive = () => {
    const now = new Date();
    const eventStart = new Date(isoDateString);
    const eventEnd = new Date(
      eventStart.getTime() + event.duration_minutes * 60000,
    );
    return now >= eventStart && now <= eventEnd;
  };

  return (
    <SimpleCell
      before={<Icon28CalendarOutline />}
      subtitle={<Footnote>{subtitleString}</Footnote>}
      after={<IconButton onClick={onClick ? () => onClick(event) : undefined}><Icon24InfoCircleOutline /></IconButton>}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {isEventLive() && (
          <Tooltip description="Мероприятие идет прямо сейчас">
            <Badge
              mode="prominent"
              aria-label="Live"
              style={{ marginRight: 8 }}
            >
              Live
            </Badge>
          </Tooltip>
        )}
        {event.has_tariff_warning && (
          <Tooltip description="Превышен лимит голосов по тарифу">
            <div
              className="event-card-warning-dot"
              style={{ position: "static", marginRight: 8, flexShrink: 0 }}
            />
          </Tooltip>
        )}
        <Text weight="1">{event.name}</Text>
      </div>
    </SimpleCell>
  );
};
