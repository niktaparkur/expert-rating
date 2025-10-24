import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { Group } from "@vkontakte/vkui";
import { PromoCodeCard } from "./PromoCodeCard";

const meta: Meta<typeof PromoCodeCard> = {
  title: "Components/Admin/PromoCodeCard",
  component: PromoCodeCard,
  decorators: [(Story) => <Group>{Story()}</Group>],
  tags: ["autodocs"],
  args: {
    onMenuClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PromoCodeCard>;

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);

export const ActiveWithExpiry: Story = {
  name: "Активный (с датой)",
  args: {
    promoCode: {
      id: 1,
      code: "SALE25",
      discount_percent: 25,
      is_active: true,
      expires_at: futureDate.toISOString(),
    },
  },
};

export const ActivePermanent: Story = {
  name: "Активный (бессрочный)",
  args: {
    promoCode: {
      id: 2,
      code: "WELCOME10",
      discount_percent: 10,
      is_active: true,
      expires_at: undefined,
    },
  },
};

export const Inactive: Story = {
  name: "Неактивный",
  args: {
    promoCode: {
      id: 3,
      code: "OLDPROMO",
      discount_percent: 50,
      is_active: false,
      expires_at: new Date().toISOString(),
    },
  },
};

export const List: Story = {
  name: "Список промокодов",
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <PromoCodeCard {...ActiveWithExpiry.args} {...args} />
      <PromoCodeCard {...ActivePermanent.args} {...args} />
      <PromoCodeCard {...Inactive.args} {...args} />
    </div>
  ),
};
