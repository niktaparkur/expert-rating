import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { Group } from "@vkontakte/vkui";
import { EventDashboardCard } from "./EventDashboardCard";
import { EventData } from "../../types";

const meta: Meta<typeof EventDashboardCard> = {
  title: "Components/Event/EventDashboardCard",
  component: EventDashboardCard,
  // Оборачиваем в Group, чтобы карточка выглядела естественно (как в VKUI)
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    onShowQrClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EventDashboardCard>;

// Вспомогательная функция для дат
const getFutureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString();
};

const getPastDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString();
};

// Базовый объект события
const baseEvent: EventData = {
  id: 1,
  expert_id: 1,
  status: "approved",
  name: "Презентация нового продукта VK",
  description: "Большая презентация для инвесторов и пользователей",
  promo_word: "VK2025",
  event_date: getFutureDate(),
  duration_minutes: 60,
  event_link: "https://vk.com/video",
  is_private: false,
  votes_count: 0,
  trust_count: 0,
  distrust_count: 0,
  has_tariff_warning: false,
};

// 1. Активное мероприятие (Одобрено, дата в будущем)
export const Active: Story = {
  name: "Активное (Одобрено)",
  args: {
    event: {
      ...baseEvent,
      status: "approved",
      votes_count: 130,
      trust_count: 140,
      distrust_count: 10,
    },
  },
};

// 2. Ожидание модерации
export const Pending: Story = {
  name: "На модерации",
  args: {
    event: {
      ...baseEvent,
      status: "pending",
      name: "Подозрительный вебинар",
    },
  },
};

// 3. Отклонено
export const Rejected: Story = {
  name: "Отклонено",
  args: {
    event: {
      ...baseEvent,
      status: "rejected",
      //   rejection_reason: "Название содержит ненормативную лексику",
      name: "Запрещенный контент",
    },
  },
};

// 4. Архив (Прошедшее)
export const Archive: Story = {
  name: "Архив (Прошедшее)",
  args: {
    event: {
      ...baseEvent,
      status: "approved",
      event_date: getPastDate(), // Дата в прошлом
      name: "Прошедший митап 2024",
      votes_count: 500,
      trust_count: 450,
      distrust_count: 50,
    },
  },
};

// 5. Без кнопки QR (например, для режима только чтения)
export const ReadOnly: Story = {
  name: "Без действий (Read Only)",
  args: {
    onShowQrClick: undefined, // Кнопка не отрисуется
    event: {
      ...baseEvent,
      votes_count: 10,
      trust_count: 10,
      distrust_count: 0,
    },
  },
};
