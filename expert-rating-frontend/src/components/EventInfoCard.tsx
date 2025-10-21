import React from 'react';
import {Avatar, Footnote, IconButton, SimpleCell, Text} from '@vkontakte/vkui';
import {Icon28CalendarOutline, Icon28MoreVertical} from '@vkontakte/icons';
import {format, isSameDay} from 'date-fns';
import {ru} from 'date-fns/locale';
import './EventInfoCard.css';
import {EventData} from '../types';

interface EventInfoCardProps {
    event: EventData;
    isArchived?: boolean;
    showContextMenu: boolean;
    onMenuClick: (event: EventData) => void;
}

export const EventInfoCard = ({event, showContextMenu, onMenuClick}: EventInfoCardProps) => {
    const isoDateString = event.event_date.endsWith('Z') ? event.event_date : event.event_date + 'Z';
    const eventDate = new Date(isoDateString);
    const endDate = new Date(eventDate.getTime() + event.duration_minutes * 60000);

    let subtitleString: string;
    if (isSameDay(eventDate, endDate)) {
        const timeString = `${format(eventDate, 'HH:mm')} — ${format(endDate, 'HH:mm')}`;
        const dateString = format(eventDate, 'd MMMM', {locale: ru});
        subtitleString = `${timeString}, ${dateString}`;
    } else {
        const startString = format(eventDate, 'HH:mm, d MMMM', {locale: ru});
        const endString = format(endDate, 'HH:mm, d MMMM', {locale: ru});
        subtitleString = `${startString} — ${endString}`;
    }

    return (
        <SimpleCell
            before={<Avatar size={48}
                            style={{background: 'var(--vkCom--color_background_accent_themed)'}}><Icon28CalendarOutline
                fill="var(--vkCom--color_icon_contrast)"/></Avatar>}
            after={showContextMenu && (
                <div className="event-card-menu-container"><IconButton onClick={() => onMenuClick(event)}
                                                                       aria-label="Действия с мероприятием"><Icon28MoreVertical/></IconButton>{event.has_tariff_warning &&
                    <div className="event-card-warning-dot"/>}</div>)}
            subtitle={<Footnote>{subtitleString}</Footnote>} // Используем новую переменную
        >
            <Text weight="1">{event.name}</Text>
        </SimpleCell>
    );
};