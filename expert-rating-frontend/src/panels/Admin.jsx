import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, ScreenSpinner, Div, Text, Spinner,
    ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Avatar, InfoRow, Tabs, TabsItem,
    CardGrid, Card, SimpleCell, Alert
} from '@vkontakte/vkui';
import { Icon24Cancel, Icon24Delete } from '@vkontakte/icons';
import { useParams } from '@vkontakte/vk-mini-apps-router';
import { RequestCard } from '../components/RequestCard';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const Admin = ({ id, setPopout }) => {
    const params = useParams();

    const [activeModal, setActiveModal] = useState(null);
    const [selectedTab, setSelectedTab] = useState('moderation');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [expertRequests, setExpertRequests] = useState([]);
    const [eventRequests, setEventRequests] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState({ experts: true, events: true, users: true });
    const [error, setError] = useState(null);
    const [requestToOpenId, setRequestToOpenId] = useState(params?.vk_id || null);

    const fetchData = useCallback(() => {
        setPopout(<ScreenSpinner state="loading" />);
        setError(null);
        setLoading({ experts: true, events: true, users: true });
        const fetchExperts = fetch(`${API_URL}/experts/admin/pending`).then(res => res.json());
        const fetchEvents = fetch(`${API_URL}/events/admin/pending`).then(res => res.json());
        const fetchUsers = fetch(`${API_URL}/experts/admin/all_users`).then(res => res.json());

        Promise.allSettled([fetchExperts, fetchEvents, fetchUsers])
            .then(results => {
                const [expertsResult, eventsResult, usersResult] = results;
                if (expertsResult.status === 'fulfilled') setExpertRequests(expertsResult.value); else setError(prev => `${prev || ''} Ошибка загрузки заявок экспертов.`);
                if (eventsResult.status === 'fulfilled') setEventRequests(eventsResult.value); else setError(prev => `${prev || ''} Ошибка загрузки заявок мероприятий.`);
                if (usersResult.status === 'fulfilled') setAllUsers(usersResult.value); else setError(prev => `${prev || ''} Ошибка загрузки пользователей.`);
            })
            .finally(() => {
                setLoading({ experts: false, events: false, users: false });
                setPopout(null);

            });
    }, [setPopout]);

    useEffect(fetchData, [fetchData]);

    useEffect(() => {
        if (requestToOpenId && expertRequests.length > 0) {
            const request = expertRequests.find(req => String(req.vk_id) === String(requestToOpenId));
            if (request) {
                openExpertRequest(request);
                setRequestToOpenId(null);
            }
        }
    }, [requestToOpenId, expertRequests]);

    const openExpertRequest = (request) => { setSelectedRequest(request); setActiveModal('expert-details'); };
    const closeModal = () => { setActiveModal(null); setTimeout(() => setSelectedRequest(null), 200); };

    const handleExpertAction = async (vkId, action) => {
        closeModal();
        setPopout(<ScreenSpinner state="loading" />);
        try {
            const response = await fetch(`${API_URL}/experts/admin/${vkId}/${action}`, { method: 'POST' });
            if (!response.ok) throw new Error(`Не удалось выполнить действие: ${action}`);
            setExpertRequests(prev => prev.filter(req => req.vk_id !== vkId));
        } catch (err) {
            alert(err.message);
        } finally {
            setPopout(null);
        }
    };

    const handleEventAction = async (eventId, action) => {
        setPopout(<ScreenSpinner state="loading" />);
        try {
            const response = await fetch(`${API_URL}/events/admin/${eventId}/${action}`, { method: 'POST' });
            if (!response.ok) throw new Error(`Не удалось выполнить действие: ${action}`);
            setEventRequests(prev => prev.filter(req => req.id !== eventId));
        } catch (err) {
            alert(err.message);
        } finally {
            setPopout(null);
        }
    };

    const handleDeleteUser = (user) => {
        setPopout(
            <Alert
                actions={[
                    { title: 'Отмена', mode: 'cancel', action: () => setPopout(null) },
                    {
                        title: 'Удалить',
                        mode: 'destructive',
                        action: async () => {
                            setPopout(<ScreenSpinner state="loading" />);
                            try {
                                const response = await fetch(`${API_URL}/experts/admin/${user.vk_id}/delete`, { method: 'POST' });
                                if (!response.ok) throw new Error('Не удалось удалить пользователя');
                                setAllUsers(prev => prev.filter(u => u.vk_id !== user.vk_id));
                            } catch (err) {
                                alert(err.message);
                            } finally {
                                setPopout(null);
                            }
                        }
                    },
                ]}
                onClose={() => setPopout(null)}
                title="Подтверждение действия"
                description={`Вы уверены, что хотите удалить пользователя ${user.first_name} ${user.last_name}? Это действие необратимо.`}
            />
        );
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={closeModal}>
            <ModalPage id='expert-details' onClose={closeModal} header={<ModalPageHeader after={<PanelHeaderButton onClick={closeModal}><Icon24Cancel /></PanelHeaderButton>}>Заявка</ModalPageHeader>}>
                {selectedRequest && <Group>
                    <SimpleCell multiline before={<Avatar size={72} src={selectedRequest.photo_url} />}><InfoRow header="Имя">{selectedRequest.first_name} {selectedRequest.last_name}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Регион">{selectedRequest.region}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Регалии">{selectedRequest.regalia}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Темы">{selectedRequest.topics.join(', ')}</InfoRow></SimpleCell>
                    <SimpleCell multiline href={selectedRequest.social_link} target="_blank"><InfoRow header="Соц. сеть">Перейти</InfoRow></SimpleCell>
                    <SimpleCell multiline href={selectedRequest.performance_link} target="_blank"><InfoRow header="Выступление">Посмотреть</InfoRow></SimpleCell>
                    <Div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="l" stretched mode="primary" onClick={() => handleExpertAction(selectedRequest.vk_id, 'approve')}>Одобрить</Button>
                        <Button size="l" stretched mode="destructive" onClick={() => handleExpertAction(selectedRequest.vk_id, 'reject')}>Отклонить</Button>
                    </Div>
                </Group>}
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader>Панель Администратора</PanelHeader>
            <Tabs>
                 <TabsItem selected={selectedTab === 'moderation'} onClick={() => setSelectedTab('moderation')} id="tab-moderation" aria-controls="content-moderation">Модерация</TabsItem>
                 <TabsItem selected={selectedTab === 'users'} onClick={() => setSelectedTab('users')} id="tab-users" aria-controls="content-users">Пользователи</TabsItem>
            </Tabs>

            <div id="content-moderation" style={{ display: selectedTab === 'moderation' ? 'block' : 'none' }}>
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                <Group header={<Header>Заявки на регистрацию экспертов</Header>}>
                    {loading.experts ? <Spinner /> : (
                        expertRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        <CardGrid size="l">
                            {expertRequests.map(req => (
                                <RequestCard
                                    key={req.vk_id}
                                    request={req}
                                    type="expert"
                                    onPrimaryClick={() => openExpertRequest(req)}
                                />
                            ))}
                        </CardGrid>
                    )}
                </Group>

                <Group header={<Header>Заявки на создание мероприятий</Header>}>
                    {loading.events ? <Spinner /> : (
                        eventRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        <CardGrid size="l">
                            {eventRequests.map(req => (
                                <RequestCard
                                    key={req.id}
                                    request={req}
                                    type="event"
                                    onPrimaryClick={() => handleEventAction(req, 'approve')}
                                    onSecondaryClick={() => handleEventAction(req, 'reject')}
                                />
                            ))}
                        </CardGrid>
                    )}
                </Group>
            </div>

            <div id="content-users" role="tabpanel" aria-labelledby="tab-users" style={{ display: selectedTab === 'users' ? 'block' : 'none' }}>
                <Group header={<Header>Все пользователи и эксперты</Header>}>
                    {loading.users ? <Spinner/> : (
                        allUsers.map(user => (
                            <SimpleCell
                                key={user.vk_id}
                                before={<Avatar size={48} src={user.photo_url}/>}
                                after={<Button mode="destructive" onClick={() => handleDeleteUser(user)}><Icon24Delete/></Button>}
                                subtitle={user.status ? `Эксперт (статус: ${user.status})` : 'Пользователь'}
                            >
                                {user.first_name} {user.last_name}
                            </SimpleCell>
                        ))
                    )}
                </Group>
            </div>
        </Panel>
    );
};