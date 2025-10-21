import React from "react";
import { Group } from "@vkontakte/vkui";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react";

import { RequestCard } from "./RequestCard";

const meta: Meta<typeof RequestCard> = {
  title: "Components/Admin/RequestCard",
  component: RequestCard,
  decorators: [(Story) => <Group>{Story()}</Group>],
  args: {
    onClick: fn(),
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RequestCard>;

const expertRequestMock = {
  vk_id: 12345,
  first_name: "Иван",
  last_name: "Петров",
  photo_url: "https://avatar.iran.liara.run/public/40",
  regalia:
    "Спикер конференций HighLoad++, эксперт по PostgreSQL и асинхронным фреймворкам.",
};

const eventRequestMock = {
  id: 101,
  name: "Большая конференция по Python",
  promo_word: "PYTHONCONF",
  expert_id: 12345,
  duration_minutes: 120,
  event_date: new Date().toISOString(),
};

export const ExpertRequest: Story = {
  args: {
    type: "expert",
    request: expertRequestMock,
  },
};

export const EventRequest: Story = {
  args: {
    type: "event",
    request: eventRequestMock,
  },
};
