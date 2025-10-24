import React from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  Header,
  SimpleCell,
  RichCell,
  Avatar,
} from "@vkontakte/vkui";
import { Icon28CalendarOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { EventData } from "../../types";

interface AfishaEventModalProps {
  id: string;
  event: EventData | null;
  onClose: () => void;
}

export const AfishaEventModal = ({
  id,
  event,
  onClose,
}: AfishaEventModalProps) => {
  const routeNavigator = useRouteNavigator();
  if (!event || !event.expert_info) return null;

  const isoDateString = event.event_date.endsWith("Z")
    ? event.event_date
    : event.event_date + "Z";
  const eventDate = new Date(isoDateString);
  const endDate = new Date(
    eventDate.getTime() + event.duration_minutes * 60000,
  );

  let dateString: string;
  if (isSameDay(eventDate, endDate)) {
    dateString = `${format(eventDate, "HH:mm")} — ${format(endDate, "HH:mm")}, ${format(eventDate, "d MMMM yyyy", { locale: ru })}`;
  } else {
    dateString = `${format(eventDate, "HH:mm, d MMMM yyyy", { locale: ru })} — ${format(endDate, "HH:mm, d MMMM yyyy", { locale: ru })}`;
  }

  const handleExpertClick = () => {
    if (event.expert_info) {
      routeNavigator.push(`/expert/${event.expert_info.vk_id}`);
    }
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={<ModalPageHeader>Детали мероприятия</ModalPageHeader>}
      settlingHeight={100}
    >
      <Group>
        <Header>{event.name}</Header>
        <SimpleCell before={<Icon28CalendarOutline />} disabled>
          {dateString}
        </SimpleCell>
      </Group>
      <Group header={<Header>Эксперт</Header>}>
        <RichCell
          before={<Avatar size={72} src={event.expert_info.photo_url} />}
          onClick={handleExpertClick}
          hoverMode="background"
          activeMode="background"
          multiline
        >
          {`${event.expert_info.first_name} ${event.expert_info.last_name}`}
        </RichCell>
      </Group>
    </ModalPage>
  );
};
