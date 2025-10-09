import React from 'react';
import { Card, Header, Div, Text, Button, Avatar, InfoRow, SimpleCell } from '@vkontakte/vkui';
import { Icon28ChevronRightOutline } from '@vkontakte/icons';

export const RequestCard = ({ request, type, onPrimaryClick, onSecondaryClick }) => {
    if (!request) return null;

    if (type === 'expert') {
        return (
            <SimpleCell
                before={<Avatar size={48} src={request.photo_url} />}
                subtitle={<Text style={{ color: 'var(--vkui--color_text_secondary)' }}>{request.regalia.slice(0, 80)}...</Text>}
                after={<Icon28ChevronRightOutline />}
                onClick={onPrimaryClick}
                multiline
            >
                {request.first_name} {request.last_name}
            </SimpleCell>
        );
    }

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