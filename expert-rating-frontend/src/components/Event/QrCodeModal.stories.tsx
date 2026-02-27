import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import {
  AppRoot,
  SplitLayout,
  SplitCol,
  ModalRoot,
  View,
  Panel,
  Button,
} from "@vkontakte/vkui";
import { QrCodeModal } from "./QrCodeModal";
import { EventData } from "../../types";

const meta: Meta<typeof QrCodeModal> = {
  title: "Components/Event/QrCodeModal",
  component: QrCodeModal,
  tags: ["autodocs"],
  args: {
    onClose: fn(),
  },
  // Декоратор нужен, так как ModalPage работает только внутри ModalRoot
  decorators: [
    (Story, context) => {
      // Имитируем окружение VKUI приложения
      return (
        <AppRoot>
          <SplitLayout>
            <SplitCol>
              <View activePanel="main">
                <Panel id="main">
                  {/* Кнопка-заглушка на фоне, чтобы было понятно, что модалка сверху */}
                  <div
                    style={{
                      height: "100vh",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--vkui--color_background_content)",
                    }}
                  >
                    <Button size="l">Фоновый контент</Button>
                  </div>
                  {/* Сама модалка */}
                  <ModalRoot activeModal={context.args.id}>
                    <Story />
                  </ModalRoot>
                </Panel>
              </View>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof QrCodeModal>;

const mockEvent: EventData = {
  id: 1,
  expert_id: 123,
  status: "approved",
  name: "Конференция HighLoad++ 2025",
  description: "Обсуждение высоких нагрузок и архитектуры.",
  promo_word: "HIGH2025",
  event_date: new Date().toISOString(),
  duration_minutes: 60,
  event_link: "https://vk.com",
  is_private: false,
  votes_count: 0,
  trust_count: 0,
  distrust_count: 0,
  has_tariff_warning: false,
};

export const Default: Story = {
  name: "QR код мероприятия",
  args: {
    id: "qr-modal", // Этот ID должен совпадать с activeModal в декораторе (берется из args)
    event: mockEvent,
  },
};

export const LongName: Story = {
  name: "Длинное название",
  args: {
    id: "qr-modal-long",
    event: {
      ...mockEvent,
      name: "Очень длинное название мероприятия, которое может не поместиться в одну строку и требует переноса",
      promo_word: "SUPERLONGPROMO123",
    },
  },
};
