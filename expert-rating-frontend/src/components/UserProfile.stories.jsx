// src/components/UserProfile.stories.jsx
import React from 'react';
import { fn } from 'storybook/test';
import { UserProfile } from './UserProfile.jsx';

export default {
    title: 'Components/UserProfile',
    component: UserProfile,
};

const Template = (args) => <UserProfile {...args} />;

export const RegularUser = Template.bind({});
RegularUser.args = {
    user: {
        vk_id: 1,
        first_name: 'Мария',
        last_name: 'Петрова',
        photo_url: 'https://avatar.iran.liara.run/public',
        status: null, // Обычный пользователь не имеет статуса
    },
    onLogout: fn(),
};

export const ApprovedExpert = Template.bind({});
ApprovedExpert.args = {
    user: {
        vk_id: 2,
        first_name: 'Иван',
        last_name: 'Иванов',
        photo_url: 'https://avatar.iran.liara.run/public',
        status: 'approved', // Статус одобренного эксперта
    },
    onLogout: fn(),
};