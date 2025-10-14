// src/components/ExpertCardGrid.stories.jsx
import React from 'react';
import { CardGrid, Group, Header } from '@vkontakte/vkui';
import { fn } from 'storybook/test';
import { ExpertCard } from './ExpertCard.jsx'; // Импортируем нашу карточку

export default {
  title: 'Components/ExpertCardGrid', // Новое название в меню
  component: CardGrid, // Мы тестируем сам CardGrid
  parameters: {
    layout: 'fullscreen', // Показываем на весь экран, а не по центру
  },
};

// --- Подготовим данные для нескольких карточек ---
const exampleExperts = [
    { vk_id: 1, first_name: 'Иван', last_name: 'Иванов', rating: 92, topics: ['Программист', 'Python'], photo_url: 'https://avatar.iran.liara.run/public' },
    { vk_id: 2, first_name: 'Мария', last_name: 'Петрова', rating: 88, topics: ['Психолог', 'Консультирование'], photo_url: 'https://avatar.iran.liara.run/public' },
    { vk_id: 3, first_name: 'Алексей', last_name: 'Сидоров', rating: 85, topics: ['Маркетинг', 'SMM'], photo_url: 'https://avatar.iran.liara.run/public' },
    { vk_id: 4, first_name: 'Елена', last_name: 'Козлова', rating: 82, topics: ['Дизайн', 'UX/UI'], photo_url: 'https://avatar.iran.liara.run/public' },
];

// --- История №1: Стандартная сетка ---
export const DefaultGrid = {
  render: () => (
    // Мы эмулируем структуру из Home.jsx
    <Group header={<Header>Топ экспертов</Header>}>
        <CardGrid size="l">
            {exampleExperts.map(expert => (
                <ExpertCard
                    key={expert.vk_id}
                    expert={expert}
                    onClick={fn()} // Каждая карточка будет логировать клик
                />
            ))}
        </CardGrid>
    </Group>
  ),
};

// --- История №2: Сетка с одной карточкой (проверка на крайний случай) ---
export const SingleCardGrid = {
    render: () => (
      <Group header={<Header>Результат поиска</Header>}>
          <CardGrid size="l">
              <ExpertCard expert={exampleExperts[0]} onClick={fn()} />
          </CardGrid>
      </Group>
    ),
};

// --- История №3: Сетка размера "m" (для планшетов/десктопа) ---
export const MediumSizeGrid = {
    render: () => (
      <Group header={<Header>Эксперты поблизости</Header>}>
          {/* Меняем size, чтобы увидеть, как карточки перестраиваются */}
          <CardGrid size="m">
              {exampleExperts.map(expert => (
                  <ExpertCard key={expert.vk_id} expert={expert} onClick={fn()} />
              ))}
          </CardGrid>
      </Group>
    ),
};