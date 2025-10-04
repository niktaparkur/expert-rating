// src/components/ExpertProfileCard.jsx
import React from 'react';
import { Card, Avatar, Title, Text, Div, InfoRow, SimpleCell } from '@vkontakte/vkui';
import { Icon28Users3Outline, Icon28UserCircleOutline } from '@vkontakte/icons';

export const ExpertProfileCard = ({ expert }) => {
    if (!expert) return null;

    return (
        <Card mode="shadow">
            <Div style={{ textAlign: 'center' }}>
                <Avatar size={96} src={expert.photo} />
                <Title level="2" style={{ marginTop: '16px' }}>{expert.name}</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '8px', padding: '0 16px' }}>
                    {expert.regalia}
                </Text>
            </Div>

            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px', borderTop: '1px solid var(--vkui--color_separator_primary)', borderBottom: '1px solid var(--vkui--color_separator_primary)', marginTop: '16px' }}>
                 <div style={{ textAlign: 'center' }}>
                    <Title level="2">{expert.stats.expert}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Экспертность</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <Title level="2">{expert.stats.народный}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Народный</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <Title level="2">{expert.stats.мероприятий}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Мероприятий</Text>
                </div>
            </div>

            <SimpleCell before={<Icon28Users3Outline />} multiline>
                <InfoRow header="Регион">{expert.region}</InfoRow>
            </SimpleCell>
            <SimpleCell before={<Icon28UserCircleOutline />} href={expert.social_link} target="_blank" expandable="true">
                <InfoRow header="Социальная сеть">Перейти</InfoRow>
            </SimpleCell>
        </Card>
    );
};