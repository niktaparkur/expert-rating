import React from 'react';
import { Card, Avatar, Title, Text, Div, InfoRow, SimpleCell } from '@vkontakte/vkui';
import { Icon28Users3Outline, Icon28UserCircleOutline } from '@vkontakte/icons';

export const ExpertProfileCard = ({ expert }) => {
    if (!expert) return null;

    // Используем опциональную цепочку (?.) для безопасного доступа к данным
    const stats = expert.stats || {};
    const name = expert.first_name || '';
    const surname = expert.last_name || '';
    const photo = expert.photo_url || '';
    const regalia = expert.regalia || 'Информация о себе не указана.';
    const region = expert.region || 'Не указан';
    const social_link = expert.social_link || '';

    return (
        <Card mode="shadow">
            <Div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <Avatar size={96} src={photo} />
                <Title level="2" style={{ marginTop: '16px' }}>{name} {surname}</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '8px', padding: '0 16px' }}>
                    {regalia}
                </Text>
            </Div>

            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px', borderTop: '1px solid var(--vkui--color_separator_primary)', borderBottom: '1px solid var(--vkui--color_separator_primary)', marginTop: '16px' }}>
                 <div style={{ textAlign: 'center' }}>
                    <Title level="2">{stats.expert || 0}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Экспертность</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <Title level="2">{stats.narodny || 0}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Народный</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <Title level="2">{stats.meropriyatiy || 0}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Мероприятий</Text>
                </div>
            </div>

            <SimpleCell before={<Icon28Users3Outline />} multiline>
                <InfoRow header="Регион">{region}</InfoRow>
            </SimpleCell>

            {social_link && (
                <SimpleCell before={<Icon28UserCircleOutline />} href={social_link} target="_blank" expandable="true">
                    <InfoRow header="Социальная сеть">Перейти</InfoRow>
                </SimpleCell>
            )}
        </Card>
    );
};