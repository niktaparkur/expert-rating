// src/components/RequestCard.jsx
import React from 'react';
import { Card, Header, Div, Text, Button, Avatar, InfoRow } from '@vkontakte/vkui';

export const RequestCard = ({ request, type, onPrimaryClick, onSecondaryClick }) => {
    if (!request) return null;

    // Карточка для заявки на эксперта
    if (type === 'expert') {
        return (
            <Card mode="shadow">
                <Header
                    before={<Avatar size={40} src={request.photo_url} />}
                    aside={<Button size="s" onClick={onPrimaryClick}>Смотреть</Button>}
                >
                    {request.first_name} {request.last_name}
                </Header>
                <Div>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                        {request.regalia.slice(0, 80)}...
                    </Text>
                </Div>
            </Card>
        );
    }

    // Карточка для заявки на мероприятие
    if (type === 'event') {
        return (
            <Card mode="shadow">
                <Header multiline={true}>{request.name}</Header>
                <Div>
                    <InfoRow header="Промо-слово">{request.promo_word}</InfoRow>
                    <InfoRow header="Эксперт ID">{request.expert_id}</InfoRow>
                </Div>
                <Div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="m" stretched mode="primary" onClick={onPrimaryClick}>Одобрить</Button>
                    <Button size="m" stretched mode="destructive" onClick={onSecondaryClick}>Отклонить</Button>
                </Div>
            </Card>
        );
    }

    return null;
};