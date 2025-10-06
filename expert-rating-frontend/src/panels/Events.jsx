import React, { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, Spinner, Div, Text, ModalRoot, ModalPage, ModalPageHeader,
    SimpleCell, InfoRow, Separator, Headline
} from '@vkontakte/vkui'
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import QRCode from 'react-qr-code';
import { useApi } from '../hooks/useApi.js';
import {
    Icon24CheckCircleOutline, Icon24ErrorCircleOutline, Icon24ClockOutline,
    Icon24CalendarOutline, Icon24TagOutline, Icon24UsersOutline, Icon24Link
} from '@vkontakte/icons';

const APP_URL = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}`;

// --- Внутренний компонент: Карточка для ЛК Эксперта ---
const EventDashboardCard = ({ event, onShowQrClick }) => {
    const getStatusInfo = (status) => {
        if (status === 'pending') return { icon: <Icon24ClockOutline fill="var(--vkui--color_icon_accent)" />, text: 'На модерации', color: 'var(--vkui--color_text_accent)' };
        if (status === 'approved') return { icon: <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />, text: 'Одобрено', color: 'var(--vkui--color_text_positive)' };
        if (status === 'rejected') return { icon: <Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />, text: 'Отклонено', color: 'var(--vkui--color_text_negative)' };
        return { icon: null, text: status, color: 'inherit' };
    };
    const statusInfo = getStatusInfo(event.status);

    return (
        <Group mode="card" header={<Header>{event.name}</Header>}>
            <SimpleCell before={statusInfo.icon} multiline>
                <Headline level="1" weight="3" style={{ color: statusInfo.color }}>{statusInfo.text}</Headline>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Статус</Text>
            </SimpleCell>
            <Separator />
            <SimpleCell before={<Icon24CalendarOutline />} multiline><InfoRow header="Дата">{new Date(event.event_date + 'Z').toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</InfoRow></SimpleCell>
            <SimpleCell before={<Icon24TagOutline />} multiline><InfoRow header="Промо-слово">{event.promo_word}</InfoRow></SimpleCell>
            {event.status === 'approved' && <SimpleCell before={<Icon24UsersOutline />} multiline><InfoRow header="Проголосовало">{event.votes_count} (👍{event.trust_count} / 👎{event.distrust_count})</InfoRow></SimpleCell>}
            {event.status === 'approved' && (
                <><Separator /><Div><Button stretched size="l" mode="secondary" onClick={() => onShowQrClick(event)}>Показать QR-код</Button></Div></>
            )}
        </Group>
    );
};

// --- Внутренний компонент: Карточка для Публичной Афиши ---
const PublicEventCard = ({ event }) => {
    return (
        <Group mode="card" header={<Header>{event.name}</Header>}>
            <SimpleCell before={<Icon24CalendarOutline />} multiline>
                <InfoRow header="Дата">{new Date(event.event_date + 'Z').toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</InfoRow>
            </SimpleCell>
            {event.event_link && (
                <SimpleCell before={<Icon24Link />} href={event.event_link} target="_blank" expandable={true}>
                    <InfoRow header="Ссылка на мероприятие">Перейти</InfoRow>
                </SimpleCell>
            )}
        </Group>
    );
};


export const Events = ({ id, user }) => {
    const routeNavigator = useRouteNavigator();
    const { apiGet } = useApi();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const isExpert = user?.is_expert;

    useEffect(() => {
        if (!user) {
            setLoading(false); // Если пользователя нет, нечего грузить
            return;
        }

        const endpoint = isExpert ? '/events/my' : '/events/public';
        setLoading(true);
        setError(null);
        apiGet(endpoint)
            .then(data => setEvents(data))
            .catch(err => {
                setError(err.message);
                console.error(`Failed to fetch events from ${endpoint}:`, err);
            })
            .finally(() => setLoading(false));

    }, [apiGet, isExpert, user]);

    const openEventModal = (event) => {
        setSelectedEvent(event);
        setActiveModal('event-qr-modal');
    };
    const closeModal = () => setActiveModal(null);

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={closeModal}>
            <ModalPage id='event-qr-modal' onClose={closeModal} header={<ModalPageHeader>QR-код для голосования</ModalPageHeader>}>
                {selectedEvent && (
                    <Group>
                        <Div style={{ textAlign: 'center' }}>
                            <Header mode="primary">{selectedEvent.name}</Header>
                            <Text>Промо-слово: <strong>{selectedEvent.promo_word}</strong></Text>
                            <div style={{ background: 'white', padding: '16px', margin: '16px auto', display: 'inline-block' }}>
                                <QRCode value={`${APP_URL}#/vote/${selectedEvent.promo_word}`} size={192} />
                            </div>
                            <Text>Покажите этот QR-код участникам или продиктуйте промо-слово.</Text>
                        </Div>
                    </Group>
                )}
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader>Мероприятия</PanelHeader>

            {isExpert && (
                <Group><Div><Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('/create-event')}>Создать новое мероприятие</Button></Div></Group>
            )}

            <Header>{isExpert ? "Мои мероприятия" : "Ближайшие мероприятия"}</Header>

            {loading && <div style={{ paddingTop: 20, textAlign: 'center' }}><Spinner /></div>}
            {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}

            {!loading && !error && events.length === 0 && (
                <Group><Div><Text>Здесь пока пусто.</Text></Div></Group>
            )}

            {!loading && !error && events.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '60px' }}>
                    {isExpert ? (
                        events.map(event => <EventDashboardCard key={event.id} event={event} onShowQrClick={openEventModal} />)
                    ) : (
                        events.map(event => <PublicEventCard key={event.id} event={event} />)
                    )}
                </div>
            )}
        </Panel>
    );
};