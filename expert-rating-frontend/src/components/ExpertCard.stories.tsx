import React from 'react';
import { CardGrid, Group, Header } from '@vkontakte/vkui';
import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react';

import { ExpertCard } from './ExpertCard'; // Импортируем наш обновленный TSX компонент

const meta: Meta<typeof CardGrid> = {
  title: 'Components/ExpertCardGrid',
  component: CardGrid,
  parameters: {
    layout: 'fullscreen',
  },
  // Оборачиваем все истории в Group для консистентности
  decorators: [(Story) => <Group><Story /></Group>],
};

export default meta;
type Story = StoryObj<typeof CardGrid>;

// --- Подготовим тестовые данные ---
const exampleExperts = [
    { vk_id: 1, first_name: 'Иван', last_name: 'Иванов', photo_url: 'https://avatar.iran.liara.run/public/10', topics: ['Программист', 'Python'], show_community_rating: true, stats: { expert: 92, community: 85 } },
    { vk_id: 2, first_name: 'Мария', last_name: 'Петрова', photo_url: 'https://avatar.iran.liara.run/public/11', topics: ['Психолог', 'Консультирование'], show_community_rating: true, stats: { expert: 88, community: 81 } },
    { vk_id: 3, first_name: 'Алексей', last_name: 'Сидоров', photo_url: 'https://avatar.iran.liara.run/public/12', topics: ['Маркетинг', 'SMM'], show_community_rating: false, stats: { expert: 85, community: 79 } },
    { vk_id: 4, first_name: 'Елена', last_name: 'Козлова', photo_url: 'https://avatar.iran.liara.run/public/13', topics: ['Дизайн', 'UX/UI'], show_community_rating: true, stats: { expert: 82, community: 88 } },
];

// --- История №1: Стандартная сетка ---
export const DefaultGrid: Story = {
  args: {
    size: 'l',
    children: exampleExperts.map((expert, index) => (
        <ExpertCard
            key={expert.vk_id}
            expert={expert}
            topPosition={index + 1}
            onClick={fn()}
        />
    )),
  },
  // Добавляем Header через параметры, чтобы не дублировать его
  parameters: {
    // @ts-ignore: Storybook-specific parameter
    group: {
      header: <Header>Топ экспертов</Header>
    }
  }
};

// --- История №2: Сетка с одной карточкой ---
export const SingleCardGrid: Story = {
  args: {
    size: 'l',
    children: (
        <ExpertCard
            expert={exampleExperts[0]}
            topPosition={1}
            onClick={fn()}
        />
    ),
  },
   parameters: {
    // @ts-ignore
    group: {
      header: <Header>Результат поиска</Header>
    }
  }
};

// --- История №3: Сетка размера "m" ---
export const MediumSizeGrid: Story = {
  args: {
    ...DefaultGrid.args, // Наследуем children из DefaultGrid
    size: 'm', // Но меняем размер
  },
   parameters: {
    // @ts-ignore
    group: {
      header: <Header>Эксперты поблизости</Header>
    }
  }
};