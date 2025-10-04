// src/components/EventCard.stories.jsx
import React from 'react';
import { fn } from 'storybook/test';
import { EventCard } from './EventCard.jsx';

export default {
    title: 'Components/EventCard',
    component: EventCard,
};

const Template = (args) => <EventCard {...args} />;

export const Approved = Template.bind({});
Approved.args = {
    event: {
        id: 1,
        name: 'Конференция Python Conf 2025',
        status: 'approved',
        promo_word: 'PYTHONCONF',
        event_date: new Date().toISOString(),
        votes_count: 125,
        trust_count: 100,
        distrust_count: 25,
    },
    onShowQrClick: fn(),
};

export const Pending = Template.bind({});
Pending.args = {
    event: {
        ...Approved.args.event,
        id: 2,
        name: 'Вебинар по FastAPI',
        status: 'pending',
    },
    onShowQrClick: fn(),
};

export const Rejected = Template.bind({});
Rejected.args = {
    event: {
        ...Approved.args.event,
        id: 3,
        name: 'Мастер-класс по Дизайну',
        status: 'rejected',
    },
    onShowQrClick: fn(),
};