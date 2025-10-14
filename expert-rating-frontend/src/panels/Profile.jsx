import React, { useState } from 'react';
import {
    Panel,
    PanelHeader,
    Group,
    ModalRoot,
    ModalPage,
    ModalPageHeader,
    Switch,
    SimpleCell
} from '@vkontakte/vkui';
import { UserProfile } from '../components/UserProfile.jsx';
import { useApi } from '../hooks/useApi.js';

export const Profile = ({ id, user, setCurrentUser }) => {
    const [activeModal, setActiveModal] = useState(null);
    const { apiPut } = useApi();

    const handleSettingsChange = async (e) => {
        const { checked } = e.target;

        if (user) {
            setCurrentUser({ ...user, show_community_rating: checked });
        }

        try {
            const updatedUser = await apiPut('/users/me/settings', { show_community_rating: checked });
            setCurrentUser(updatedUser);
        } catch (error) {
            console.error("Failed to update settings:", error);
            if (user) {
                setCurrentUser({ ...user, show_community_rating: !checked });
            }
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage
                id="profile-settings-modal"
                onClose={() => setActiveModal(null)}
                header={<ModalPageHeader>Настройки профиля</ModalPageHeader>}
            >
                <Group>
                    <SimpleCell
                        Component="label"
                        disabled={!user?.is_expert}
                        after={
                            <Switch
                                checked={user?.show_community_rating ?? true}
                                onChange={handleSettingsChange}
                            />
                        }
                    >
                        Показывать мой народный рейтинг другим пользователям
                    </SimpleCell>
                </Group>
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader>Аккаунт</PanelHeader>
            {user && (
                <UserProfile
                    user={user}
                    onSettingsClick={() => setActiveModal('profile-settings-modal')}
                />
            )}
        </Panel>
    );
};