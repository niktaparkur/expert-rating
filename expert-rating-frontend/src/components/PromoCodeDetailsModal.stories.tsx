import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AppRoot, SplitLayout, SplitCol, ModalRoot } from "@vkontakte/vkui";
import { PromoCodeDetailsModal } from "./PromoCodeDetailsModal";

const meta: Meta<typeof PromoCodeDetailsModal> = {
  title: "Components/Admin/PromoCodeDetailsModal",
  component: PromoCodeDetailsModal,
  tags: ["autodocs"],
  args: {
    onClose: fn(),
  },
  decorators: [
    (Story, context) => (
      <AppRoot>
        <SplitLayout>
          <SplitCol>
            <ModalRoot activeModal={context.args.id}>
              <Story />
            </ModalRoot>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PromoCodeDetailsModal>;

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);

const promo = {
  id: 1,
  code: "SALE25",
  discount_percent: 25,
  is_active: true,
  expires_at: futureDate.toISOString(),
  created_at: new Date().toISOString(),
};

export const Default: Story = {
  name: "Окно деталей",
  args: {
    id: "details-modal",
    promoCode: promo,
  },
};
