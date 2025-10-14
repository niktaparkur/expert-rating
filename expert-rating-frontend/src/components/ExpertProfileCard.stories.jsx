// src/components/ExpertProfileCard.stories.jsx
import React from 'react';
import { ExpertProfileCard } from './ExpertProfileCard.jsx';
import { Group } from '@vkontakte/vkui';

export default {
    title: 'Components/ExpertProfileCard',
    component: ExpertProfileCard,
};

const exampleExpert = {
    id: 1, name: 'Иван Иванов', photo: 'https://avatar.iran.liara.run/public',
    regalia: 'Ведущий Python-разработчик в VK. Спикер HighLoad++. Специализация на асинхронных фреймворках и базах данных.',
    region: 'Московская область',
    social_link: 'https://vk.com/durov',
    stats: { expert: 86, narodny: 50, meropriyatiy: 4 }
};

export const Default = {
    render: () => (
        <Group>
            <ExpertProfileCard expert={exampleExpert} />
        </Group>
    )
};