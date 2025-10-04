// src/components/ExpertProfileCard.stories.jsx
import React from 'react';
import { ExpertProfileCard } from './ExpertProfileCard.jsx';
import { Group } from '@vkontakte/vkui';

export default {
    title: 'Components/ExpertProfileCard',
    component: ExpertProfileCard,
};

const exampleExpert = {
    id: 1, name: 'Иван Иванов', photo: 'https://via.placeholder.com/96',
    regalia: 'Ведущий Python-разработчик в VK. Спикер HighLoad++. Специализация на асинхронных фреймворках и базах данных.',
    region: 'Московская область',
    social_link: 'https://vk.com/durov',
    stats: { expert: 86, народный: 50, мероприятий: 4 }
};

export const Default = {
    render: () => (
        <Group>
            <ExpertProfileCard expert={exampleExpert} />
        </Group>
    )
};