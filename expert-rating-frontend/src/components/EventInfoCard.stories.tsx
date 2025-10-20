import React from 'react';
import type {Meta, StoryObj} from '@storybook/react';
import {fn} from 'storybook/test';
import {Group} from '@vkontakte/vkui';
import {EventInfoCard} from './EventInfoCard';
import {EventData} from '../types';

const meta: Meta<typeof EventInfoCard> = {
    title: 'Components/EventInfoCard',
    component: EventInfoCard,
    decorators: [(Story) => <Group>{Story()}</Group>],
    tags: ['autodocs'],
    args: {
        onMenuClick: fn(), // Для отслеживания кликов в панели Actions
    },
};

export default meta;
type Story = StoryObj<typeof EventInfoCard>;

// --- Mock Data ---
const baseEvent: EventData = {
    id: 1,
    expert_id: 101,
    status: 'approved',
    name: 'Большая конференция по Python',
    promo_word: 'PYTHONCONF',
    event_date: new Date().toISOString(),
    duration_minutes: 90,
    votes_count: 52,
    trust_count: 48,
    distrust_count: 4,
    is_private: false,
    has_tariff_warning: false,
};

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3);

// --- Stories ---
export const Default: Story = {
    name: 'Стандартная (Запланированная)',
    args: {
        event: {
            ...baseEvent,
            event_date: futureDate.toISOString(),
        },
        showContextMenu: true,
    },
};

export const WithTariffWarning: Story = {
    name: 'С предупреждением о тарифе',
    args: {
        event: {
            ...baseEvent,
            event_date: futureDate.toISOString(),
            has_tariff_warning: true, // Включаем флаг
        },
        showContextMenu: true,
    },
};

export const Archived: Story = {
    name: 'Архивная (без меню)',
    args: {
        event: {
            ...baseEvent,
            name: 'Прошедший вебинар по TypeScript',
            event_date: '2025-10-10T12:00:00Z',
        },
        isArchived: true,
        showContextMenu: false, // Меню не показывается для архивных
    },
};