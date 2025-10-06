import React, { useState } from 'react';
import {
    Panel, PanelHeader, Group, ModalRoot, ModalPage, ModalPageHeader, FormItem, Switch, SimpleCell
} from '@vkontakte/vkui';
import { UserProfile } from '../components/UserProfile.jsx';

export const Profile = ({ id, user }) => {
    const [activeModal, setActiveModal] = useState(null);
    const [showPublicRating, setShowPublicRating] = useState(true); // TODO: save this setting

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
                        after={
                            <Switch
                                checked={showPublicRating}
                                onChange={(e) => setShowPublicRating(e.target.checked)}
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