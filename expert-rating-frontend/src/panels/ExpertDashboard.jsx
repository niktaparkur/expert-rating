import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, Group, Header, Button, Spinner, Div, Text, ModalRoot, ModalCard, CardGrid } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import QRCode from 'react-qr-code';
import { EventCard } from '../components/EventCard'; // <-- ИМПОРТ

const API_URL = 'https://testg.potokrechi.ru/api/v1';
const APP_URL = 'https://vk.com/app54172799';

export const ExpertDashboard = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        async function fetchEvents() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/events/my`);
                if (!response.ok) throw new Error('Не удалось загрузить мероприятия');
                const data = await response.json();
                setEvents(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchEvents();
    }, []);

    const openEventModal = (event) => {
        setSelectedEvent(event);
        setActiveModal('event-qr-modal');
    };
    const closeModal = () => setActiveModal(null);

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={closeModal}>
            <ModalCard id='event-qr-modal' onClose={closeModal} header={`Мероприятие "${selectedEvent?.name}"`}>
                <Div style={{ textAlign: 'center' }}>
                    <Text>Промо-слово: <strong>{selectedEvent?.promo_word}</strong></Text>
                    <div style={{ background: 'white', padding: '16px', margin: '16px auto', display: 'inline-block' }}>
                        {selectedEvent && <QRCode value={`${APP_URL}#/vote/${selectedEvent.promo_word}`} size={128} />}
                    </div>
                    <Text>Покажите этот QR-код участникам для голосования.</Text>
                </Div>
            </ModalCard>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader>Личный кабинет</PanelHeader>
            <Group><Div><Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('/create-event')}>Создать новое мероприятие</Button></Div></Group>
            <Group header={<Header>Мои мероприятия</Header>}>
                {loading && <Spinner />}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && events.length === 0 && <Div><Text>У вас пока нет мероприятий.</Text></Div>}
                {!loading && events.length > 0 && (
                    <CardGrid size="l">
                        {events.map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onShowQrClick={() => openEventModal(event)}
                            />
                        ))}
                    </CardGrid>
                )}
            </Group>
        </Panel>
    );
};