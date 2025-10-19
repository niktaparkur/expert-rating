import React from 'react';
import { SimpleCell, Avatar, Text } from '@vkontakte/vkui';
import { Icon28ChevronRightOutline, Icon28CalendarOutline } from '@vkontakte/icons';

interface ExpertRequest {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    regalia: string;
}

interface EventRequest {
    id: number;
    name: string;
    promo_word: string;
}

type RequestCardProps<T extends 'expert' | 'event'> = {
    type: T;
    request: T extends 'expert' ? ExpertRequest : EventRequest;
    onClick: () => void;
};

export const RequestCard = <T extends 'expert' | 'event'>({ type, request, onClick }: RequestCardProps<T>) => {

    if (type === 'expert') {
        const expertRequest = request as ExpertRequest;
        return (
            <SimpleCell
                before={<Avatar size={48} src={expertRequest.photo_url} />}
                subtitle={<Text style={{ color: 'var(--vkui--color_text_secondary)' }}>{expertRequest.regalia.slice(0, 80)}...</Text>}
                after={<Icon28ChevronRightOutline />}
                onClick={onClick}
                multiline
            >
                {expertRequest.first_name} {expertRequest.last_name}
            </SimpleCell>
        );
    }

    if (type === 'event') {
        const eventRequest = request as EventRequest;
        return (
            <SimpleCell
                before={<Avatar size={48}><Icon28CalendarOutline /></Avatar>}
                subtitle={`Промо-слово: ${eventRequest.promo_word}`}
                after={<Icon28ChevronRightOutline />}
                onClick={onClick}
                multiline
            >
                {eventRequest.name}
            </SimpleCell>
        );
    }

    return null;
};