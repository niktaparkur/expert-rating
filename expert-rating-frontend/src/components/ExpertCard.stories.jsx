// src/components/ExpertCard.stories.jsx
import React from 'react';
import { fn } from 'storybook/test'; // <-- ИСПОЛЬЗУЕМ НОВЫЙ fn
import { ExpertCard } from './ExpertCard.jsx';

export default {
  title: 'Components/ExpertCard',
  component: ExpertCard,
  tags: ['autodocs'], // Добавляем тег для автоматической документации
  // Используем `fn` для шпионажа за onClick, как в примере с Button
  args: {
    onClick: fn(),
  },
};

// --- История №1: Обычное состояние ---
export const Default = {
  args: {
    expert: {
      vk_id: 1,
      first_name: 'Иван',
      last_name: 'Иванов',
      rating: 92,
      topics: ['Программист', 'Python'],
      photo_url: 'https://avatar.iran.liara.run/public'
    },
  },
};

// --- История №2: Карточка с длинными данными ---
export const WithLongData = {
  args: {
    expert: {
      vk_id: 2,
      first_name: 'Константин',
      last_name: 'Константинопольский',
      rating: 77,
      topics: ['Машинное обучение', 'Искусственный интеллект', 'Big Data', 'NLP'],
      photo_url: 'https://avatar.iran.liara.run/public'
    },
  },
};

// --- История №3: Карточка без тем ---
export const WithoutTopics = {
  args: {
    expert: {
      vk_id: 3,
      first_name: 'Анна',
      last_name: 'Петрова',
      rating: 85,
      topics: [],
      photo_url: 'https://avatar.iran.liara.run/public'
    },
  },
};


