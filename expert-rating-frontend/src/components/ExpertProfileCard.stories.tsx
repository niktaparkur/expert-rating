import React from 'react';
import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react';

import { ExpertProfileCard } from './ExpertProfileCard';

const meta: Meta<typeof ExpertProfileCard> = {
  title: 'Components/ExpertProfileCard',
  component: ExpertProfileCard,
  tags: ['autodocs'],
  args: {
    onVoteClick: fn(),
    onFutureFeatureClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ExpertProfileCard>;

const exampleExpert = {
  first_name: 'Иван',
  last_name: 'Иванов',
  photo_url: 'https://avatar.iran.liara.run/public/30',
  regalia: 'Ведущий Python-разработчик в VK. Спикер HighLoad++. Специализация на асинхронных фреймворках и базах данных.',
  social_link: 'https://vk.com/',
  topics: ['Программист', 'Анализ и обработка данных'],
  stats: { expert: 86, community: 50, events_count: 4 },
  show_community_rating: true,
};

export const Default: Story = {
  args: {
    expert: exampleExpert,
  },
};

export const WithoutCommunityRating: Story = {
  args: {
    expert: {
      ...exampleExpert,
      show_community_rating: false,
    },
  },
};

export const WithoutRegaliaAndTopics: Story = {
  args: {
    expert: {
      ...exampleExpert,
      regalia: '',
      topics: [],
    },
  },
};