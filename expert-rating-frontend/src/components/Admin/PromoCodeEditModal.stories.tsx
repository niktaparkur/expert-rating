import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AppRoot, SplitLayout, SplitCol, ModalRoot } from "@vkontakte/vkui";
import { PromoCodeEditModal } from "./PromoCodeEditModal";

const meta: Meta<typeof PromoCodeEditModal> = {
  title: "Components/Admin/PromoCodeEditModal",
  component: PromoCodeEditModal,
  tags: ["autodocs"],
  args: {
    onClose: fn(),
    onSave: fn(),
    onDelete: fn(),
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
type Story = StoryObj<typeof PromoCodeEditModal>;

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);

const existingPromo = {
  id: 1,
  code: "SALE25",
  discount_percent: 25,
  is_active: true,
  expires_at: futureDate.toISOString(),
};

export const CreateMode: Story = {
  name: "Режим создания",
  args: {
    id: "create-promo",
    promoCode: null,
  },
};

export const EditMode: Story = {
  name: "Режим редактирования",
  args: {
    id: "edit-promo",
    promoCode: existingPromo,
  },
};
