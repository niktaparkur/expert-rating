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
import { AdminTariffEditModal } from "./AdminTariffEditModal";

const meta: Meta<typeof AdminTariffEditModal> = {
  title: "Components/Admin/Tariff/AdminTariffEditModal",
  component: AdminTariffEditModal,
  tags: ["autodocs"],
  args: {
    id: "admin-tariff-edit", // ID модалки должен совпадать с activeModal в декораторе
    onClose: fn(),
    onSave: fn(),
  },
  // Оборачиваем в стандартную структуру VKUI для работы модальных окон
  decorators: [
    (Story, context) => (
      <AppRoot>
        <SplitLayout>
          <SplitCol>
            <View activePanel="main">
              <Panel id="main">
                {/* Фоновая кнопка для имитации интерфейса под модалкой */}
                <div
                  style={{
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Button mode="secondary">Фон админки</Button>
                </div>

                <ModalRoot activeModal={context.args.id}>
                  <Story />
                </ModalRoot>
              </Panel>
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AdminTariffEditModal>;

// Пример данных тарифа, как они приходят с бэкенда (с features)
const sampleTariff = {
  id: 1,
  name: "Профи",
  price_votes: 3999,
  vk_donut_link: "https://vk.com/donut/example",
  is_active: true,
  // Эмуляция структуры, которую парсит компонент
  features: [
    { text: "30 мероприятий", tooltip: "Мероприятий в месяц" },
    { text: "24 часа", tooltip: "Длительность голосования" },
    { text: "1000 голосов", tooltip: "Голосов на мероприятие" },
  ],
};

export const EditMode: Story = {
  name: "Редактирование тарифа",
  args: {
    tariff: sampleTariff,
  },
};

export const CreateMode: Story = {
  name: "Создание (пустая форма)",
  args: {
    tariff: null, // При null форма должна быть пустой
  },
};
