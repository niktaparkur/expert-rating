import React from 'react';
import { Panel, PanelHeader, Group } from '@vkontakte/vkui';
import { UserProfile } from '../components/UserProfile.jsx';

export const Profile = ({ id, user }) => {
    // Данные `user` теперь приходят из App.jsx

    const handleLogout = () => {
        // Логика выхода, если она понадобится в будущем
        console.log("Logout action");
    };

    return (
        <Panel id={id}>
            <PanelHeader>Аккаунт</PanelHeader>
            {user && (
                <UserProfile user={user} onLogout={handleLogout} />
            )}
            {!user &&
                <Group>
                    {/* Можно показать заглушку, если пользователь по какой-то причине не загрузился */}
                </Group>
            }
        </Panel>
    );
};