import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Group } from "@vkontakte/vkui";
import { AfishaEventCard } from "./AfishaEventCard";
import { EventData } from "../../types";

const meta: Meta<typeof AfishaEventCard> = {
  title: "Components/Afisha/AfishaEventCard",
  component: AfishaEventCard,
  decorators: [(Story) => <Group>{Story()}</Group>],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AfishaEventCard>;

const createEvent = (
  id: number,
  daysFromNow: number,
  name: string,
  expertName: { first: string; last: string },
): EventData => {
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + daysFromNow);
  eventDate.setHours(19, 0, 0, 0);

  return {
    id: id,
    expert_id: 100 + id,
    status: "approved",
    name: name,
    promo_word: `EVENT${id}`,
    event_date: eventDate.toISOString(),
    duration_minutes: 60,
    votes_count: 0,
    trust_count: 0,
    distrust_count: 0,
    is_private: false,
    has_tariff_warning: false,
    expert_info: {
      vk_id: 100 + id,
      first_name: expertName.first,
      last_name: expertName.last,
      photo_url: `https://avatar.iran.liara.run/public/${id * 2}`,
    },
  };
};

const mockEvents: EventData[] = [
  createEvent(1, 1, "Вебинар по современному JavaScript", {
    first: "Анна",
    last: "Кузнецова",
  }),
  createEvent(2, 3, "Мастер-класс: Продвижение в социальных сетях", {
    first: "Петр",
    last: "Сергеев",
  }),
  createEvent(3, 3, 'Лекция "Основы инвестирования для начинающих"', {
    first: "Елена",
    last: "Михайлова",
  }),
  createEvent(4, 7, "Круглый стол: Будущее искусственного интеллекта", {
    first: "Дмитрий",
    last: "Волков",
  }),
  createEvent(
    5,
    10,
    "Практикум по ораторскому искусству и публичным выступлениям",
    { first: "Ольга", last: "Белова" },
  ),
];

export const Default: Story = {
  name: "Одиночная карточка",
  args: {
    event: mockEvents[0],
  },
};

export const AfishaFeed: Story = {
  name: "Лента Афиши (5 карточек)",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {mockEvents.map((event) => (
        <AfishaEventCard key={event.id} event={event} />
      ))}
    </div>
  ),
};
