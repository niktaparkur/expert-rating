import React from "react";
import { Card, Header, Div, InfoRow, Button } from "@vkontakte/vkui";

export const EventCard = ({ event, onShowQrClick }) => {
  if (!event) return null;

  const getStatusText = (status) => {
    if (status === "pending") return "На модерации";
    if (status === "approved") return "Одобрено";
    if (status === "rejected") return "Отклонено";
    return status;
  };

  return (
    <Card mode="shadow">
      <Header>{event.name}</Header>
      <Div>
        <InfoRow header="Статус">{getStatusText(event.status)}</InfoRow>
        <InfoRow header="Промо-слово">{event.promo_word}</InfoRow>
        <InfoRow header="Дата">
          {new Date(event.event_date + "Z").toLocaleString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </InfoRow>
        {event.status === "approved" && (
          <InfoRow header="Проголосовало">
            {event.votes_count} (👍{event.trust_count} / 👎
            {event.distrust_count})
          </InfoRow>
        )}
      </Div>
      {event.status === "approved" && (
        <Div>
          <Button stretched onClick={onShowQrClick}>
            Показать QR-код
          </Button>
        </Div>
      )}
    </Card>
  );
};
