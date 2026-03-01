import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AdminTariffCard } from "./AdminTariffCard";

const meta: Meta<typeof AdminTariffCard> = {
  title: "Components/Admin/Tariff/AdminTariffCard",
  component: AdminTariffCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AdminTariffCard>;

export const Default: Story = {
  args: {
    tariff: {
      id: 1,
      name: "Стандарт",
      price_str: "999 ₽",
      features: [
        { text: "10 мероприятий", tooltip: "Мероприятий в месяц" },
        { text: "12 часов", tooltip: "Длительность голосования" },
      ],
    },
    onEdit: () => alert("Edit clicked"),
  },
};
