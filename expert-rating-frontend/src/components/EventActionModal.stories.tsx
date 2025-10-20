import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { AppRoot, SplitLayout, SplitCol, ModalRoot } from '@vkontakte/vkui';
import { EventActionModal } from './EventActionModal';
import { EventData } from '../types';

const meta: Meta<typeof EventActionModal> = {
  title: 'Components/Modals/EventActionModal',
  component: EventActionModal,
  tags: ['autodocs'],
  args: {
    // Используем fn() для отслеживания вызовов в панели Actions
    onClose: fn(),
    onShare: fn(),
    onDelete: fn(),
  },
  // Модальные окна требуют специального декоратора для корректного отображения
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
type Story = StoryObj<typeof EventActionModal>;

// --- Mock Data: Подготовим тестовые данные для разных состояний ---

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 5); // Мероприятие через 5 дней

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5); // Мероприятие было 5 дней назад

const baseEvent: EventData = {
    id: 1,
    expert_id: 101,
    status: 'approved',
    name: 'Большая конференция по Python',
    promo_word: 'PYTHONCONF',
    event_date: futureDate.toISOString(),
    duration_minutes: 90,
    votes_count: 52,
    trust_count: 48,
    distrust_count: 4,
    is_private: false,
    has_tariff_warning: false,
};

// --- Stories: Разные состояния компонента ---

export const Default: Story = {
  name: 'Запланированное мероприятие',
  args: {
    id: 'default-modal', // Уникальный ID для Storybook
    event: {
      "id": 1,
      "expert_id": 101,
      "status": "approved",
      "name": "Большая конференция по Python",
      "promo_word": "PYTHONCONF",
      "event_date": "2025-10-25T06:48:01.354Z",
      "duration_minutes": 90,
      "votes_count": 52,
      "trust_count": 0,
      "distrust_count": 0,
      "is_private": false,
      "has_tariff_warning": false
    },
  },
};

export const WithTariffWarning: Story = {
  name: 'С предупреждением о тарифе',
  args: {
    id: 'warning-modal',
    event: {
      "id": 1,
      "expert_id": 101,
      "status": "approved",
      "name": "Большая конференция по Python",
      "promo_word": "PYTHONCONF",
      "event_date": "2025-10-25T06:50:14.179Z",
      "duration_minutes": 90,
      "votes_count": 52,
      "trust_count": 89,
      "distrust_count": 21,
      "is_private": false,
      "has_tariff_warning": true
    },
  },
};

export const Archived: Story = {
  name: 'Завершенное (Архивное)',
  args: {
    id: 'archived-modal',
    event: {
        ...baseEvent,
        name: 'Прошедший вебинар по TypeScript',
        event_date: pastDate.toISOString(), // Указываем прошедшую дату
    },
  },
};

export const Pending: Story = {
    name: 'На модерации',
    args: {
        id: 'pending-modal',
        event: {
          "id": 1,
          "expert_id": 101,
          "status": "pending",
          "name": "Большая конференция по Python",
          "promo_word": "PYTHONCONF",
          "event_date": "2025-10-25T06:49:28.010Z",
          "duration_minutes": 90,
          "votes_count": 52,
          "trust_count": 0,
          "distrust_count": 0,
          "is_private": false,
          "has_tariff_warning": false
        },
    },
};

export const Rejected: Story = {
    name: 'Отклоненное',
    args: {
        id: 'rejected-modal',
        event: {
          "id": 1,
          "expert_id": 101,
          "status": "rejected",
          "name": "Большая конференция по Python",
          "promo_word": "PYTHONCONF",
          "event_date": "2025-10-25T06:50:06.824Z",
          "duration_minutes": 90,
          "votes_count": 52,
          "trust_count": 0,
          "distrust_count": 0,
          "is_private": false,
          "has_tariff_warning": false
        },
    },
};