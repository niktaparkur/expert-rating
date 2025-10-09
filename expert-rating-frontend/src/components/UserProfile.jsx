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
    IconButton,
    Header,
    SimpleCell,
    Button
} from '@vkontakte/vkui';
import {
    Icon20FavoriteCircleFillYellow,
    Icon20CheckCircleFillGreen,
    Icon24ListBulletSquareOutline,
    Icon28SettingsOutline
} from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export const UserProfile = ({ user, onSettingsClick }) => {
    if (!user) return null;
    const routeNavigator = useRouteNavigator();

    const getRoleText = () => {
        const roles = [];
        if (user.is_admin) roles.push('Администратор');
        if (user.is_expert) roles.push('Эксперт');
        if (roles.length === 0) return 'Пользователь';
        return roles.join(' | ');
    };

    const showExpertData = user.is_expert || user.status === 'pending';

    return (
        <Group>
            <Card mode="shadow" style={{ position: 'relative' }}>
                <SimpleCell
                    before={<Avatar size={96} src={user.photo_url} />}
                    after={showExpertData && (
                        <IconButton onClick={onSettingsClick}>
                            <Icon28SettingsOutline />
                        </IconButton>
                    )}
                    subtitle={<Text style={{ color: 'var(--vkui--color_text_secondary)' }}>{getRoleText()}</Text>}
                    disabled
                >
                    <Title level="2">{user.first_name} {user.last_name}</Title>
                </SimpleCell>

                <Div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)', paddingTop: 0 }}>
                    <Text>Тариф: {user.tariff_plan || 'Начальный'}</Text>
                </Div>

                {showExpertData && user.topics && user.topics.length > 0 && (
                    <Div>
                        <Header mode="tertiary">Направления</Header>
                        {user.topics.map(topic => (
                            <SimpleCell key={topic} disabled multiline>{topic}</SimpleCell>
                        ))}
                    </Div>
                )}

                {showExpertData && (
                    <Div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>

                        <Tooltip description="Экспертный рейтинг">
                            <div className="stat-item">
                                <Icon20CheckCircleFillGreen />
                                <Title level="3">{user.stats?.expert || 0}</Title>
                            </div>
                        </Tooltip>
                        <Tooltip description="Народный рейтинг">
                            <div className="stat-item">
                                <Icon20FavoriteCircleFillYellow />
                                <Title level="3">{user.stats?.community || 0}</Title>
                            </div>
                        </Tooltip>
                        <Tooltip description="Проведено мероприятий">
                            <div className="stat-item">
                                <Icon24ListBulletSquareOutline width={20} height={20} />
                                <Title level="3">{user.stats?.events_count || 0}</Title>
                            </div>
                        </Tooltip>
                    </Div>
                )}

                {!user.is_expert && user.status !== 'pending' && (
                    <Div>
                        <Button
                            stretched
                            size="l"
                            mode="secondary"
                            onClick={() => routeNavigator.push('/registration')}
                        >
                            Стать экспертом
                        </Button>
                    </Div>
                )}
            </Card>
        </Group>
    );
};