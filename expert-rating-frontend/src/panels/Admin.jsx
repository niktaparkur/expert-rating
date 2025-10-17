import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, ScreenSpinner, Div, Text, Spinner,
    ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Avatar, InfoRow, Tabs, TabsItem,
    SimpleCell, Alert, PanelHeaderBack, Snackbar, IconButton
} from '@vkontakte/vkui';
import { Icon16Cancel, Icon24Cancel, Icon24Delete } from '@vkontakte/icons';
import { useRouteNavigator, useSearchParams } from '@vkontakte/vk-mini-apps-router';
import { RequestCard } from '../components/RequestCard';
import { useApi } from '../hooks/useApi';

export const Admin = ({ id, setPopout, setSnackbar }) => {
    const routeNavigator = useRouteNavigator();
    const [searchParams] = useSearchParams();
    const { apiGet, apiPost } = useApi();

    const [activeModal, setActiveModal] = useState(null);
    const [selectedTab, setSelectedTab] = useState('moderation');
    const [selectedRequest, setSelectedRequest] = useState(null);

    // --- Состояния и загрузка разделены для каждой вкладки ---
    const [expertRequests, setExpertRequests] = useState([]);
    const [eventRequests, setEventRequests] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    const [loading, setLoading] = useState({ experts: false, events: false, users: false });
    const [error, setError] = useState(null);

    const requestToOpenId = searchParams.get('vk_id');

    // --- Логика ленивой загрузки данных в зависимости от активной вкладки ---
    useEffect(() => {
        // Функция для загрузки данных вкладки "Модерация"
        const fetchModerationData = async () => {
            // Не перезагружаем, если данные уже есть
            if (expertRequests.length > 0 || eventRequests.length > 0) return;

            setLoading(prev => ({ ...prev, experts: true, events: true }));
            setError(null);
            try {
                // Запросы выполняются параллельно
                const [expertsData, eventsData] = await Promise.all([
                    apiGet('/experts/admin/pending'),
                    apiGet('/events/admin/pending')
                ]);
                setExpertRequests(expertsData);
                setEventRequests(eventsData);

                // Если в URL есть ID для открытия, открываем модалку
                if (requestToOpenId) {
                    const requestToOpen = expertsData.find(req => String(req.vk_id) === String(requestToOpenId));
                    if (requestToOpen) {
                        openExpertRequest(requestToOpen);
                    }
                }
            } catch (e) {
                setError(e.message || "Ошибка загрузки данных модерации");
                showErrorSnackbar(e.message || "Ошибка загрузки данных модерации");
            } finally {
                setLoading(prev => ({ ...prev, experts: false, events: false }));
            }
        };

        // Функция для загрузки данных вкладки "Пользователи"
        const fetchUsersData = async () => {
            // Не перезагружаем, если данные уже есть
            if (allUsers.length > 0) return;

            setLoading(prev => ({ ...prev, users: true }));
            setError(null);
            try {
                const usersData = await apiGet('/experts/admin/all_users');
                setAllUsers(usersData);
            } catch (e) {
                setError(e.message || "Ошибка загрузки пользователей");
                showErrorSnackbar(e.message || "Ошибка загрузки пользователей");
            } finally {
                setLoading(prev => ({ ...prev, users: false }));
            }
        };

        // Вызываем нужную функцию в зависимости от активной вкладки
        if (selectedTab === 'moderation') {
            fetchModerationData();
        } else if (selectedTab === 'users') {
            fetchUsersData();
        }
    }, [selectedTab, apiGet, expertRequests.length, eventRequests.length, allUsers.length, requestToOpenId]);

    const openExpertRequest = (request) => {
        setSelectedRequest(request);
        setActiveModal('expert-details');
    };

    const closeModal = () => {
        setActiveModal(null);
        setTimeout(() => setSelectedRequest(null), 200);
    };

    const showErrorSnackbar = (message) => {
        setSnackbar(<Snackbar duration={3000} onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>{message}</Snackbar>);
    };

    const handleExpertAction = async (vkId, action) => {
        closeModal();
        setPopout(<ScreenSpinner state="loading" />);
        try {
            await apiPost(`/experts/admin/${vkId}/${action}`);
            setExpertRequests(prev => prev.filter(req => req.vk_id !== vkId));
        } catch (err) {
            showErrorSnackbar(err.message);
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
            showErrorSnackbar(err.message);
        } finally {
            setPopout(null);
        }
    };

    const handleDeleteUser = (user) => {
        const performDelete = async () => {
            setPopout(<ScreenSpinner state="loading" />);
            try {
                await apiPost(`/experts/admin/${user.vk_id}/delete`);
                setAllUsers(prev => prev.filter(u => u.vk_id !== user.vk_id));
            } catch (err) {
                showErrorSnackbar(err.message);
            } finally {
                setPopout(null);
            }
        };
        setPopout(
            <Alert
                actions={[{ title: 'Отмена', mode: 'cancel' }, { title: 'Удалить', mode: 'destructive', action: performDelete }]}
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
                    <Div>
                        <InfoRow header="Темы">
                            <Text>{selectedRequest.topics.join(', ')}</Text>
                        </InfoRow>
                    </Div>
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
                 <TabsItem selected={selectedTab === 'moderation'} onClick={() => setSelectedTab('moderation')} id="tab-moderation">Модерация</TabsItem>
                 <TabsItem selected={selectedTab === 'users'} onClick={() => setSelectedTab('users')} id="tab-users">Пользователи</TabsItem>
            </Tabs>

            {error && <Group><Div><Text style={{ color: 'var(--vkui--color_text_negative)' }}>{error}</Text></Div></Group>}

            <div style={{ display: selectedTab === 'moderation' ? 'block' : 'none', paddingBottom: 60 }}>
                <Group header={<Header>Заявки на регистрацию экспертов</Header>}>
                    {loading.experts ? <Spinner /> : (
                        expertRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        expertRequests.map(req => (
                            <RequestCard key={req.vk_id} request={req} type="expert" onPrimaryClick={() => openExpertRequest(req)} />
                        ))
                    )}
                </Group>
                <Group header={<Header>Заявки на создание мероприятий</Header>}>
                    {loading.events ? <Spinner /> : (
                        eventRequests.length === 0 ? <Div><Text>Новых заявок нет</Text></Div> :
                        eventRequests.map(req => (
                            <RequestCard key={req.id} request={req} type="event" onPrimaryClick={() => handleEventAction(req.id, 'approve')} onSecondaryClick={() => handleEventAction(req.id, 'reject')} />
                        ))
                    )}
                </Group>
            </div>
            <div style={{ display: selectedTab === 'users' ? 'block' : 'none', paddingBottom: 60 }}>
                <Group header={<Header>Все пользователи и эксперты</Header>}>
                    {loading.users ? <Spinner/> : (
                         allUsers.length === 0 ? <Div><Text>Пользователи не найдены.</Text></Div> :
                        allUsers.map(user => (
                            <SimpleCell
                                key={user.vk_id}
                                before={<Avatar size={48} src={user.photo_url}/>}
                                after={<IconButton hoverMode="destructive" onClick={() => handleDeleteUser(user)}><Icon24Delete/></IconButton>}
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