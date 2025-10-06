// src/components/UserProfile.jsx

import React from 'react';
import {
    Group,
    Card,
    Avatar,
    Title,
    Text,
    Div,
    Tooltip,
    ContentBadge,
    IconButton
} from '@vkontakte/vkui';
import {
    Icon20FavoriteCircleFillYellow,
    Icon20CheckCircleFillGreen,
    Icon24ListBulletSquareOutline,
    Icon28SettingsOutline
} from '@vkontakte/icons';

export const UserProfile = ({ user, onSettingsClick }) => {
    if (!user) return null;

    const getRoleText = () => {
        if (user.is_admin) return 'Администратор';
        if (user.is_expert) return 'Эксперт';
        return 'Пользователь';
    };

    const getShortTopicName = (topic) => {
        const parts = topic.split(' > ');
        return parts[parts.length - 1];
    };

    return (
        <Group>
            <Card mode="shadow" style={{ position: 'relative' }}>
                {/* --- ИЗМЕНЕНИЕ: Иконка настроек --- */}
                {user.is_expert && (
                    <IconButton
                        onClick={onSettingsClick}
                        style={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <Icon28SettingsOutline />
                    </IconButton>
                )}

                {/* --- ИЗМЕНЕНИЕ: Центрированная компоновка --- */}
                <Div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar size={96} src={user.photo_url} />
                    <Title level="2" style={{ marginTop: '16px' }}>{user.first_name} {user.last_name}</Title>
                    <Text style={{ marginTop: '4px', color: 'var(--vkui--color_text_secondary)' }}>{getRoleText()}</Text>
                </Div>

                {/* --- ИЗМЕНЕНИЕ: Блок направлений добавлен --- */}
                {user.is_expert && user.topics && user.topics.length > 0 && (
                     <Div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', paddingTop: 0 }}>
                        {user.topics.map(topic => (
                            <ContentBadge key={topic} mode="primary">{getShortTopicName(topic)}</ContentBadge>
                        ))}
                    </Div>
                )}

                {user.is_expert && (
                    <Div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)', paddingTop: 0 }}>
                        <Text>Тариф: {user.tariff_plan || 'Начальный'}</Text>
                    </Div>
                )}

                {/* Рейтинги и активность (только если эксперт) */}
                {user.is_expert && (
                    <Div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <Tooltip text="Народный рейтинг">
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon20FavoriteCircleFillYellow />
                                    <Title level="3">{user.stats?.narodny || 0}</Title>
                                </div>
                            </div>
                        </Tooltip>
                        <Tooltip text="Экспертный рейтинг">
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon20CheckCircleFillGreen />
                                    <Title level="3">{user.stats?.expert || 0}</Title>
                                </div>
                            </div>
                        </Tooltip>
                        <Tooltip text="Проведено мероприятий">
                            <div style={{ textAlign: 'center' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon24ListBulletSquareOutline width={20} height={20} />
                                    <Title level="3">{user.stats?.meropriyatiy || 0}</Title>
                                </div>
                            </div>
                        </Tooltip>
                    </Div>
                )}


            </Card>
        </Group>
    );
};