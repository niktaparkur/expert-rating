import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, ScreenSpinner, Div, Text, Spinner,
    ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Avatar, InfoRow, Tabs, TabsItem,
    SimpleCell, Alert, PanelHeaderBack
} from '@vkontakte/vkui';
import { Icon24Cancel, Icon24Delete } from '@vkontakte/icons';
import { useRouteNavigator, useSearchParams } from '@vkontakte/vk-mini-apps-router';
import { RequestCard } from '../components/RequestCard';
import { useApi } from '../hooks/useApi';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const Admin = ({ id, setPopout }) => {
    const routeNavigator = useRouteNavigator();
    const [searchParams] = useSearchParams();
    const { apiGet, apiPost } = useApi();

    const [activeModal, setActiveModal] = useState(null);
    const [selectedTab, setSelectedTab] = useState('moderation');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [expertRequests, setExpertRequests] = useState([]);
    const [eventRequests, setEventRequests] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState({ experts: true, events: true, users: true });
    const [error, setError] = useState(null);

    const requestToOpenId = searchParams.get('vk_id');

    const fetchData = useCallback(async () => {
        setPopout(<ScreenSpinner state="loading" />);
        setError(null);
        setLoading({ experts: true, events: true, users: true });

        try {
            setLoading(prev => ({ ...prev, experts: true }));
            const expertsData = await apiGet('/experts/admin/pending');
            setExpertRequests(expertsData);
            setLoading(prev => ({ ...prev, experts: false }));

            await sleep(200);

            setLoading(prev => ({ ...prev, events: true }));
            const eventsData = await apiGet('/events/admin/pending');
            setEventRequests(eventsData);
            setLoading(prev => ({ ...prev, events: false }));

            await sleep(200);

            setLoading(prev => ({ ...prev, users: true }));
            const usersData = await apiGet('/experts/admin/all_users');
            setAllUsers(usersData);
            setLoading(prev => ({ ...prev, users: false }));

            if (requestToOpenId) {
                const requestToOpen = expertsData.find(req => String(req.vk_id) === String(requestToOpenId));
                if (requestToOpen) {
                    openExpertRequest(requestToOpen);
                }
            }

        } catch (e) {
            setError(e.message || "Ошибка загрузки данных");
            console.error(e);
        } finally {
            setLoading({ experts: false, events: false, users: false });
            setPopout(null);
        }
    }, [apiGet, setPopout, requestToOpenId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openExpertRequest = (request) => { setSelectedRequest(request); setActiveModal('expert-details'); };
    const closeModal = () => { setActiveModal(null); setTimeout(() => setSelectedRequest(null), 200); };

    const handleExpertAction = async (vkId, action) => {
        closeModal();
        setPopout(<ScreenSpinner state="loading" />);
        try {
            await apiPost(`/experts/admin/${vkId}/${action}`);
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
            const body = action === 'reject' ? { reason: "Нарушение правил" } : {};
            await apiPost(`/events/admin/${eventId}/${action}`, body);
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
                actions={[{ title: 'Отмена', mode: 'cancel', action: () => setPopout(null) }, { title: 'Удалить', mode: 'destructive', action: async () => { setPopout(<ScreenSpinner state="loading" />); try { await apiPost(`/experts/admin/${user.vk_id}/delete`); setAllUsers(prev => prev.filter(u => u.vk_id !== user.vk_id)); } catch (err) { alert(err.message); } finally { setPopout(null); } } }]}
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
                    <SimpleCell multiline href={selectedRequest.social_link} target="_blank" expandable="true"><InfoRow header="Соц. сеть">Перейти</InfoRow></SimpleCell>
                    <SimpleCell multiline href={selectedRequest.performance_link} target="_blank" expandable="true"><InfoRow header="Выступление">Посмотреть</InfoRow></SimpleCell>
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
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Панель Администратора</PanelHeader>
            <Tabs>
                 <TabsItem selected={selectedTab === 'moderation'} onClick={() => setSelectedTab('moderation')} id="tab-moderation" aria-controls="content-moderation">Модерация</TabsItem>
                 <TabsItem selected={selectedTab === 'users'} onClick={() => setSelectedTab('users')} id="tab-users" aria-controls="content-users">Пользователи</TabsItem>
            </Tabs>

            <div id="content-moderation" role="tabpanel" aria-labelledby="tab-moderation" style={{ display: selectedTab === 'moderation' ? 'block' : 'none', paddingBottom: 60 }}>
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                <Group header={<Header>Заявки на регистрацию экспертов</Header>}>
                    {loading.experts ? <Spinner /> : (
                        expertRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        expertRequests.map(req => (
                            <RequestCard
                                key={req.vk_id}
                                request={req}
                                type="expert"
                                onPrimaryClick={() => openExpertRequest(req)}
                            />
                        ))
                    )}
                </Group>
                <Group header={<Header>Заявки на создание мероприятий</Header>}>
                    {loading.events ? <Spinner /> : (
                        eventRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        eventRequests.map(req => (
                            <RequestCard
                                key={req.id}
                                request={req}
                                type="event"
                                onPrimaryClick={() => handleEventAction(req.id, 'approve')}
                                onSecondaryClick={() => handleEventAction(req.id, 'reject')}
                            />
                        ))
                    )}
                </Group>
            </div>
            <div id="content-users" role="tabpanel" aria-labelledby="tab-users" style={{ display: selectedTab === 'users' ? 'block' : 'none', paddingBottom: 60 }}>
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