import React from 'react';
import { Card, Header, SimpleCell, RichCell, Avatar } from '@vkontakte/vkui';
import { Icon28CalendarOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventData } from '../types';

interface AfishaEventCardProps {
    event: EventData;
}

export const AfishaEventCard = ({ event }: AfishaEventCardProps) => {
    const routeNavigator = useRouteNavigator();

    if (!event.expert_info) {
        return null;
    }

    const isoDateString = event.event_date.endsWith('Z') ? event.event_date : event.event_date + 'Z';
    const eventDate = new Date(isoDateString);
    const dateString = format(eventDate, 'd MMMM, HH:mm', { locale: ru });

    const handleExpertClick = () => {
        routeNavigator.push(`/expert/${event.expert_info.vk_id}`);
    };

    return (
        <Card mode="shadow">
            <Header>{event.name}</Header>
            <SimpleCell before={<Icon28CalendarOutline />} disabled>
                {dateString}
            </SimpleCell>

            <RichCell
                before={<Avatar size={48} src={event.expert_info.photo_url} />}
                subtitle="Эксперт"
                onClick={handleExpertClick}
                hoverMode="background"
                activeMode="background"
            >
                {`${event.expert_info.first_name} ${event.expert_info.last_name}`}
            </RichCell>
        </Card>
    );
};