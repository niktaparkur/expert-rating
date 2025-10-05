// src/panels/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, Group, Spinner, Div, Text } from '@vkontakte/vkui';
import { UserProfile } from '../components/UserProfile.jsx';
import bridge from '@vkontakte/vk-bridge';

// Пример данных пользователя, в будущем будут грузиться с API
const exampleUser = {
    vk_id: 12345,
    first_name: 'Пользователь',
    last_name: 'Тестовый',
    photo_url: 'https://via.placeholder.com/96',
    status: 'approved' // 'approved' или null
};

export const Profile = ({ id }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Заменить на реальный запрос на GET /users/me
        // bridge.send('VKWebAppGetUserInfo').then(data => { setUser(data); ... });
        setTimeout(() => {
            setUser(exampleUser);
            setLoading(false);
        }, 500);
    }, []);

    const handleLogout = () => {
        // TODO: Реализовать логику выхода (если нужна)
        alert('Выход из системы');
    };

    return (
        <Panel id={id}>
            <PanelHeader>Аккаунт</PanelHeader>
            {loading && <Spinner />}
            {!loading && user && (
                <UserProfile user={user} onLogout={handleLogout} />
            )}
        </Panel>
    );
};