// src/components/RequestCard.stories.jsx
import React from 'react';
import { fn } from 'storybook/test';
import { RequestCard } from './RequestCard.jsx';
import { CardGrid, Group } from '@vkontakte/vkui';

export default {
    title: 'Components/RequestCard',
    component: RequestCard,
};

const expertRequestData = {
    vk_id: 1,
    first_name: 'Иван',
    last_name: 'Иванов',
    photo_url: 'https://avatar.iran.liara.run/public',
    regalia: 'Ведущий разработчик, спикер конференций, автор статей на Хабре и просто хороший человек.'
};

const eventRequestData = {
    id: 1,
    name: 'Большая IT-конференция',
    promo_word: 'ITCONF2025',
    expert_id: 12345
};

export const ExpertRequest = {
    args: {
        request: expertRequestData,
        type: 'expert',
        onPrimaryClick: fn(),
    },
};

export const EventRequest = {
    args: {
        request: eventRequestData,
        type: 'event',
        onPrimaryClick: fn(),
        onSecondaryClick: fn(),
    },
};

// История, показывающая сетку из нескольких карточек
export const RequestGrid = {
    render: () => (
        <Group>
            <CardGrid size="l">
                <RequestCard request={expertRequestData} type="expert" onPrimaryClick={fn()} />
                <RequestCard request={eventRequestData} type="event" onPrimaryClick={fn()} onSecondaryClick={fn()} />
                <RequestCard request={expertRequestData} type="expert" onPrimary-click={fn()} />
            </CardGrid>
        </Group>
    ),
};