import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, ScreenSpinner, Div, Text, Spinner,
    ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Avatar, InfoRow, Tabs, TabsItem,
    SimpleCell, Alert, PanelHeaderBack, Snackbar, IconButton, Pagination, FormItem, Select, FormLayoutGroup, Search, Placeholder
} from '@vkontakte/vkui';
import { Icon16Cancel, Icon24Cancel, Icon24Delete, Icon28CalendarOutline, Icon28ChevronRightOutline, Icon56UsersOutline } from '@vkontakte/icons';
import { useRouteNavigator, useSearchParams } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi';
import { debounce } from 'lodash';
import { RequestCard } from '../components/RequestCard';

// --- Типизация ---
interface ExpertRequest {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    regalia: string;
    social_link: string;
    performance_link: string;
    region: string;
    topics: string[];
}

interface EventRequest {
    id: number;
    name: string;
    promo_word: string;
    expert_id: number;
    duration_minutes: number;
    event_date: string;
    event_link?: string;
}

interface User {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    status: 'approved' | 'pending' | 'rejected' | null;
    is_expert: boolean;
}

interface PaginatedUsers {
    items: User[];
    total_count: number;
}

interface AdminPanelProps {
    id: string;
    setPopout: (popout: React.ReactNode | null) => void;
    setSnackbar: (snackbar: React.ReactNode | null) => void;
}
export const Admin = ({ id, setPopout, setSnackbar }: AdminPanelProps) => {
    const routeNavigator = useRouteNavigator();
    const [searchParams] = useSearchParams();
    const { apiGet, apiPost } = useApi();

    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('moderation');

    // Стейты для модерации
    const [expertRequests, setExpertRequests] = useState<ExpertRequest[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [selectedExpert, setSelectedExpert] = useState<ExpertRequest | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<EventRequest | null>(null);
    const [loadingModeration, setLoadingModeration] = useState(true);

    // Стейты для пользователей
    const [users, setUsers] = useState<User[]>([]);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersPage, setUsersPage] = useState(1);
    const [usersSearch, setUsersSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [usersFilter, setUsersFilter] = useState({ type: 'all', date: 'desc' });
    const [loadingUsers, setLoadingUsers] = useState(false);

    const requestToOpenId = searchParams.get('vk_id');

    const debounceSearch = useCallback(debounce((query: string) => setDebouncedSearch(query), 500), []);
    useEffect(() => {
        debounceSearch(usersSearch);
    }, [usersSearch, debounceSearch]);

    // Загрузка данных при смене вкладок или фильтров
    useEffect(() => {
        const fetchModerationData = async () => {
            if (expertRequests.length > 0 || eventRequests.length > 0) {
                setLoadingModeration(false);
                return;
            };
            setLoadingModeration(true);
            try {
                const [expertsData, eventsData] = await Promise.all([
                    apiGet('/experts/admin/pending') as Promise<ExpertRequest[]>,
                    apiGet('/events/admin/pending') as Promise<EventRequest[]>
                ]);
                setExpertRequests(expertsData || []);
                setEventRequests(eventsData || []);
                if (requestToOpenId) {
                    const requestToOpen = (expertsData || []).find(req => String(req.vk_id) === String(requestToOpenId));
                    if (requestToOpen) openExpertRequest(requestToOpen);
                }
            } catch (e) {
                showErrorSnackbar((e as Error).message || "Ошибка загрузки заявок");
            } finally {
                setLoadingModeration(false);
            }
        };

        const fetchUsersData = async () => {
            setLoadingUsers(true);
            try {
                const params = new URLSearchParams({
                    page: String(usersPage),
                    size: '50',
                    search: debouncedSearch,
                    user_type: usersFilter.type,
                    sort_by_date: usersFilter.date,
                });
                const usersData = await apiGet(`/experts/admin/all_users?${params.toString()}`) as PaginatedUsers;
                setUsers(usersData.items || []);
                setUsersTotal(usersData.total_count || 0);
            } catch (e) {
                showErrorSnackbar((e as Error).message || "Ошибка загрузки пользователей");
            } finally {
                setLoadingUsers(false);
            }
        };

        if (selectedTab === 'moderation') {
            fetchModerationData();
        } else if (selectedTab === 'users') {
            fetchUsersData();
        }
    }, [selectedTab, usersPage, debouncedSearch, usersFilter, apiGet]);

    // Сброс страницы при поиске/фильтрации
    useEffect(() => {
        setUsersPage(1);
    }, [debouncedSearch, usersFilter]);

    const openExpertRequest = (request: ExpertRequest) => { setSelectedExpert(request); setActiveModal('expert-details'); };
    const openEventRequest = (event: EventRequest) => { setSelectedEvent(event); setActiveModal('event-details'); };

    const closeModal = () => {
        setActiveModal(null);
        setTimeout(() => {
            setSelectedExpert(null);
            setSelectedEvent(null);
        }, 200);
    };

    const showErrorSnackbar = (message: string) => setSnackbar(<Snackbar duration={3000} onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>{message}</Snackbar>);

    const handleExpertAction = async (vkId: number, action: 'approve' | 'reject') => {
        closeModal();
        setPopout(<ScreenSpinner state="loading" />);
        try {
            await apiPost(`/experts/admin/${vkId}/${action}`);
            setExpertRequests(prev => prev.filter(req => req.vk_id !== vkId));
        } catch (err) {
            showErrorSnackbar((err as Error).message);
        } finally {
            setPopout(null);
        }
    };

    const handleEventAction = async (eventId: number, action: 'approve' | 'reject') => {
        closeModal();
        setPopout(<ScreenSpinner state="loading" />);
        try {
            const body = action === 'reject' ? { reason: "Нарушение правил" } : {};
            await apiPost(`/events/admin/${eventId}/${action}`, body);
            setEventRequests(prev => prev.filter(req => req.id !== eventId));
        } catch (err) {
            showErrorSnackbar((err as Error).message);
        } finally {
            setPopout(null);
        }
    };

    const handleDeleteUser = (user: User) => {
        const performDelete = async () => {
            setPopout(<ScreenSpinner state="loading" />);
            try {
                await apiPost(`/experts/admin/${user.vk_id}/delete`);
                setUsers(prev => prev.filter(u => u.vk_id !== user.vk_id));
                setUsersTotal(prev => prev - 1);
            } catch (err) {
                showErrorSnackbar((err as Error).message);
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
            <ModalPage id='expert-details' onClose={closeModal} header={<ModalPageHeader after={<PanelHeaderButton onClick={closeModal}><Icon24Cancel /></PanelHeaderButton>}>Заявка эксперта</ModalPageHeader>}>
                {selectedExpert && <Group>
                    <SimpleCell multiline before={<Avatar size={72} src={selectedExpert.photo_url} />}><InfoRow header="Имя">{selectedExpert.first_name} {selectedExpert.last_name}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Регион">{selectedExpert.region}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Регалии">{selectedExpert.regalia}</InfoRow></SimpleCell>
                    <Div><InfoRow header="Темы"><Text>{selectedExpert.topics.join(', ')}</Text></InfoRow></Div>
                    <SimpleCell multiline href={selectedExpert.social_link} target="_blank"><InfoRow header="Соц. сеть">Перейти</InfoRow></SimpleCell>
                    <SimpleCell multiline href={selectedExpert.performance_link} target="_blank"><InfoRow header="Выступление">Посмотреть</InfoRow></SimpleCell>
                    <Div style={{ display: 'flex', gap: '8px' }}><Button size="l" stretched mode="primary" onClick={() => handleExpertAction(selectedExpert.vk_id, 'approve')}>Одобрить</Button><Button size="l" stretched appearance="negative" onClick={() => handleExpertAction(selectedExpert.vk_id, 'reject')}>Отклонить</Button></Div>
                </Group>}
            </ModalPage>
            <ModalPage id='event-details' onClose={closeModal} header={<ModalPageHeader after={<PanelHeaderButton onClick={closeModal}><Icon24Cancel /></PanelHeaderButton>}>Заявка на мероприятие</ModalPageHeader>}>
                {selectedEvent && <Group>
                    <SimpleCell multiline><InfoRow header="Название">{selectedEvent.name}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Промо-слово">{selectedEvent.promo_word}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="ID эксперта">{selectedEvent.expert_id}</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Длительность">{selectedEvent.duration_minutes} мин.</InfoRow></SimpleCell>
                    <SimpleCell multiline><InfoRow header="Дата начала">{new Date(selectedEvent.event_date).toLocaleString('ru-RU')}</InfoRow></SimpleCell>
                    <SimpleCell multiline href={selectedEvent.event_link} target="_blank"  disabled={!selectedEvent.event_link}><InfoRow header="Ссылка на трансляцию">{selectedEvent.event_link ? "Перейти" : "Не указана"}</InfoRow></SimpleCell>
                    <Div style={{ display: 'flex', gap: '8px' }}><Button size="l" stretched mode="primary" onClick={() => handleEventAction(selectedEvent.id, 'approve')}>Одобрить</Button><Button size="l" stretched appearance="negative" onClick={() => handleEventAction(selectedEvent.id, 'reject')}>Отклонить</Button></Div>
                </Group>}
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Панель Администратора</PanelHeader>
            <Tabs>
                 <TabsItem selected={selectedTab === 'moderation'} onClick={() => setSelectedTab('moderation')} id="tab-moderation" aria-controls={id}>Модерация</TabsItem>
                 <TabsItem selected={selectedTab === 'users'} onClick={() => setSelectedTab('users')} id="tab-users" aria-controls={id}>Пользователи</TabsItem>
            </Tabs>

            <div style={{ display: selectedTab === 'moderation' ? 'block' : 'none', paddingBottom: 60 }}>
                <Group header={<Header>Заявки на регистрацию экспертов</Header>}>
                    {loadingModeration ? <Spinner /> : (
                        expertRequests.length === 0 ? <Placeholder>Новых заявок нет</Placeholder> :
                        expertRequests.map((req: ExpertRequest) => <RequestCard key={req.vk_id} request={req} type="expert" onClick={() => openExpertRequest(req)} />)
                    )}
                </Group>
                <Group header={<Header>Заявки на создание мероприятий</Header>}>
                    {loadingModeration ? <Spinner /> : (
                        eventRequests.length === 0 ? <Placeholder>Новых заявок нет</Placeholder> :
                        eventRequests.map((req: EventRequest) => <RequestCard key={req.id} request={req} type="event" onClick={() => openEventRequest(req)} />)
                    )}
                </Group>
            </div>
            <div style={{ display: selectedTab === 'users' ? 'block' : 'none', paddingBottom: 60 }}>
                <Group>
                    <Search value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} placeholder="Поиск по имени, фамилии или ID" />
                    <FormLayoutGroup mode="horizontal">
                        <FormItem top="Тип пользователя">
                            <Select value={usersFilter.type} onChange={(e) => setUsersFilter(prev => ({...prev, type: e.target.value}))} options={[{ label: 'Все', value: 'all' }, { label: 'Только эксперты', value: 'expert' }, { label: 'Только пользователи', value: 'user' }]} />
                        </FormItem>
                        <FormItem top="Сортировка по дате">
                            <Select value={usersFilter.date} onChange={(e) => setUsersFilter(prev => ({...prev, date: e.target.value}))} options={[{ label: 'Сначала новые', value: 'desc' }, { label: 'Сначала старые', value: 'asc' }]} />
                        </FormItem>
                    </FormLayoutGroup>
                </Group>
                <Group header={<Header>Список пользователей ({usersTotal})</Header>}>
                    {loadingUsers ? <Spinner/> : (
                         users.length === 0 ? <Placeholder icon={<Icon56UsersOutline />}>Пользователи не найдены</Placeholder> :
                        users.map((user: User) => (
                            <SimpleCell
                                key={user.vk_id}
                                before={<Avatar size={48} src={user.photo_url}/>}
                                after={<IconButton hoverMode="destructive" onClick={() => handleDeleteUser(user)} aria-label="Удалить пользователя"><Icon24Delete/></IconButton>}
                                subtitle={user.is_expert ? `Эксперт (статус: ${user.status || 'approved'})` : 'Пользователь'}
                            >
                                {user.first_name} {user.last_name}
                            </SimpleCell>
                        ))
                    )}
                    {usersTotal > 50 && !loadingUsers && (
                        <Pagination
                            currentPage={usersPage}
                            totalPages={Math.ceil(usersTotal / 50)}
                            onChange={(page) => setUsersPage(page)}
                        />
                    )}
                </Group>
            </div>
        </Panel>
    );
};