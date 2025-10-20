import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Group } from '@vkontakte/vkui';
import { AfishaEventCard } from './AfishaEventCard';
import { EventData } from '../types';

const meta: Meta<typeof AfishaEventCard> = {
  title: 'Components/Afisha/AfishaEventCard',
  component: AfishaEventCard,
  decorators: [(Story) => <Group>{Story()}</Group>],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AfishaEventCard>;

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3);

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
    expert_info: {
        vk_id: 101,
        first_name: 'Иван',
        last_name: 'Иванов',
        photo_url: 'https://avatar.iran.liara.run/public/10',
    }
};

export const Default: Story = {
  name: 'Стандартная карточка',
  args: {
    event: baseEvent,
  },
};

export const WithLongName: Story = {
    name: 'С длинным названием',
    args: {
        event: {
            ...baseEvent,
            name: 'Очень длинное название для мероприятия, которое должно корректно переноситься на несколько строк',
        },
    },
};