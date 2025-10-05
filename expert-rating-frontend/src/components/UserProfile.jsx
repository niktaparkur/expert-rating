// src/components/UserProfile.jsx
import React from 'react';
import { Group, Card, Avatar, Title, Text, Div, SimpleCell, InfoRow } from '@vkontakte/vkui';
import { Icon28UserStarBadgeOutline, Icon28UserOutline, Icon28DoorArrowRightOutline } from '@vkontakte/icons';

export const UserProfile = ({ user, onLogout }) => {
    if (!user) return null;

    const isExpert = user.status === 'approved';

    return (
        <Group>
            <Card mode="shadow">
                <Div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar size={96} src={user.photo_url} />
                    <Title level="2" style={{ marginTop: '16px' }}>{user.first_name} {user.last_name}</Title>
                    {isExpert ? (
                         <Text style={{ marginTop: '8px', color: 'var(--vkui--color_text_positive)' }}>
                             <Icon28UserStarBadgeOutline width={16} height={16} style={{ marginRight: 4, verticalAlign: 'middle' }}/>
                             Статус: Эксперт
                         </Text>
                    ) : (
                         <Text style={{ marginTop: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                             <Icon28UserOutline width={16} height={16} style={{ marginRight: 4, verticalAlign: 'middle' }}/>
                             Статус: Пользователь
                         </Text>
                    )}
                </Div>
            </Card>
        </Group>
    );
};