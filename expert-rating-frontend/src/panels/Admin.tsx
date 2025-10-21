import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
    Panel, PanelHeader, Group, Header, Button, ScreenSpinner, Div, Spinner,
    ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, Avatar, InfoRow, Tabs, TabsItem,
    SimpleCell, Alert, PanelHeaderBack, Snackbar, IconButton, FormItem, Select, FormLayoutGroup, Search, Placeholder,
    ActionSheet, ActionSheetItem, usePlatform, Platform, Text
} from '@vkontakte/vkui';
import {Icon16Cancel, Icon24Cancel, Icon28MoreVertical, Icon56UsersOutline} from '@vkontakte/icons';
import {useRouteNavigator} from '@vkontakte/vk-mini-apps-router';
import {useApi} from '../hooks/useApi';
import {debounce} from 'lodash';
import {RequestCard} from '../components/RequestCard';
import {PromoCodeCard} from '../components/PromoCodeCard';
import {PromoCodeEditModal} from '../components/PromoCodeEditModal';
import {PromoCodeDetailsModal} from "../components/PromoCodeDetailsModal";

// Типизация
interface User {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    status: 'approved' | 'pending' | 'rejected' | null;
    is_expert: boolean;
}

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

interface AdminPanelProps {
    id: string;
    setPopout: (popout: React.ReactNode | null) => void;
    setSnackbar: (snackbar: React.ReactNode | null) => void;
}

export const Admin = ({id, setPopout, setSnackbar}: AdminPanelProps) => {
    const routeNavigator = useRouteNavigator();
    const {apiGet, apiPost, apiPut, apiDelete} = useApi();
    const platform = usePlatform();
    const usersObserverRef = useRef<HTMLDivElement>(null);
    const promoObserverRef = useRef<HTMLDivElement>(null);

    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('moderation');
    const [activeSheet, setActiveSheet] = useState<React.ReactNode | null>(null);

    const [expertRequests, setExpertRequests] = useState<ExpertRequest[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [selectedExpert, setSelectedExpert] = useState<ExpertRequest | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<EventRequest | null>(null);
    const [loadingModeration, setLoadingModeration] = useState(true);

    const [users, setUsers] = useState<User[]>([]);
    const [usersPage, setUsersPage] = useState(1);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [usersSearch, setUsersSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [usersFilter, setUsersFilter] = useState({type: 'all', date: 'desc'});

    const [promoCodes, setPromoCodes] = useState<any[]>([]);
    const [promoCodesPage, setPromoCodesPage] = useState(1);
    const [loadingPromoCodes, setLoadingPromoCodes] = useState(false);
    const [hasMorePromoCodes, setHasMorePromoCodes] = useState(true);
    const [selectedPromoCode, setSelectedPromoCode] = useState<any | null>(null);

    const showErrorSnackbar = (message: string) => setSnackbar(<Snackbar duration={3000}
                                                                         onClose={() => setSnackbar(null)}
                                                                         before={<Icon16Cancel/>}>{message}</Snackbar>);

    const fetchModerationData = useCallback(async () => {
        setLoadingModeration(true);
        try {
            const [expertsData, eventsData] = await Promise.all([apiGet('/experts/admin/pending'), apiGet('/events/admin/pending')]);
            setExpertRequests(expertsData || []);
            setEventRequests(eventsData || []);
        } catch (e) {
            showErrorSnackbar((e as Error).message || "Ошибка загрузки заявок");
        } finally {
            setLoadingModeration(false);
        }
    }, [apiGet]);
    const fetchUsersData = useCallback(async (isNewSearch = false) => {
        if (loadingUsers) return;
        setLoadingUsers(true);
        const currentPage = isNewSearch ? 1 : usersPage;
        const params = new URLSearchParams({
            page: String(currentPage),
            size: '50',
            search: debouncedSearch,
            user_type: usersFilter.type,
            sort_by_date: usersFilter.date
        });
        try {
            const usersData = await apiGet(`/experts/admin/all_users?${params.toString()}`);
            setUsers(prev => isNewSearch ? usersData.items : [...prev, ...usersData.items]);
            setHasMoreUsers((currentPage * 50) < usersData.total_count);
            if (isNewSearch) setUsersPage(2); else setUsersPage(p => p + 1);
        } catch (e) {
            showErrorSnackbar((e as Error).message || "Ошибка загрузки пользователей");
        } finally {
            setLoadingUsers(false);
        }
    }, [apiGet, loadingUsers, usersPage, debouncedSearch, usersFilter]);
    const fetchPromoCodes = useCallback(async (isNewSearch = false) => {
        if (loadingPromoCodes) return;
        setLoadingPromoCodes(true);
        const currentPage = isNewSearch ? 1 : promoCodesPage;
        try {
            const data = await apiGet(`/promo/admin?page=${currentPage}&size=50`);
            setPromoCodes(prev => isNewSearch ? data.items : [...prev, ...data.items]);
            setHasMorePromoCodes((currentPage * 50) < data.total_count);
            if (isNewSearch) setPromoCodesPage(2); else setPromoCodesPage(p => p + 1);
        } catch (e) {
            showErrorSnackbar((e as Error).message || "Ошибка загрузки промокодов");
        } finally {
            setLoadingPromoCodes(false);
        }
    }, [apiGet, loadingPromoCodes, promoCodesPage]);

    const debouncedSetSearch = useMemo(() => debounce((query: string) => setDebouncedSearch(query), 500), []);
    useEffect(() => {
        debouncedSetSearch(usersSearch);
    }, [usersSearch, debouncedSetSearch]);

    useEffect(() => {
        if (selectedTab === 'moderation') fetchModerationData();
    }, [selectedTab, fetchModerationData]);
    useEffect(() => {
        if (selectedTab === 'users') {
            setUsers([]);
            setUsersPage(1);
            setHasMoreUsers(true);
            fetchUsersData(true);
        }
    }, [selectedTab, debouncedSearch, usersFilter]);
    useEffect(() => {
        if (selectedTab === 'promo') {
            setPromoCodes([]);
            setPromoCodesPage(1);
            setHasMorePromoCodes(true);
            fetchPromoCodes(true);
        }
    }, [selectedTab]);

    useEffect(() => {
        if (selectedTab !== 'users') return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMoreUsers && !loadingUsers) fetchUsersData();
        }, {threshold: 1.0});
        const currentObserverRef = usersObserverRef.current;
        if (currentObserverRef) observer.observe(currentObserverRef);
        return () => {
            if (currentObserverRef) observer.unobserve(currentObserverRef);
        };
    }, [selectedTab, hasMoreUsers, loadingUsers, fetchUsersData]);
    useEffect(() => {
        if (selectedTab !== 'promo') return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMorePromoCodes && !loadingPromoCodes) fetchPromoCodes();
        }, {threshold: 1.0});
        const currentObserverRef = promoObserverRef.current;
        if (currentObserverRef) observer.observe(currentObserverRef);
        return () => {
            if (currentObserverRef) observer.unobserve(currentObserverRef);
        };
    }, [selectedTab, hasMorePromoCodes, loadingPromoCodes, fetchPromoCodes]);

    const openExpertRequest = (request: ExpertRequest) => {
        setSelectedExpert(request);
        setActiveModal('expert-details');
    };
    const openEventRequest = (event: EventRequest) => {
        setSelectedEvent(event);
        setActiveModal('event-details');
    };
    const closeModal = () => {
        setActiveModal(null);
        setTimeout(() => {
            setSelectedExpert(null);
            setSelectedEvent(null);
        }, 200);
    };
    const handleExpertAction = async (vkId: number, action: 'approve' | 'reject') => {
        closeModal();
        setPopout(<ScreenSpinner state="loading"/>);
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
        setPopout(<ScreenSpinner state="loading"/>);
        try {
            const body = action === 'reject' ? {reason: "Нарушение правил"} : {};
            await apiPost(`/events/admin/${eventId}/${action}`, body);
            setEventRequests(prev => prev.filter(req => req.id !== eventId));
        } catch (err) {
            showErrorSnackbar((err as Error).message);
        } finally {
            setPopout(null);
        }
    };
    const handleDeleteUser = (userToDelete: User) => {
        const performDelete = async () => {
            setPopout(<ScreenSpinner state="loading"/>);
            try {
                await apiPost(`/experts/admin/${userToDelete.vk_id}/delete`);
                setUsers(prev => prev.filter(u => u.vk_id !== userToDelete.vk_id));
            } catch (err) {
                showErrorSnackbar((err as Error).message);
            } finally {
                setPopout(null);
            }
        };
        setPopout(<Alert actions={[{title: 'Отмена', mode: 'cancel'}, {
            title: 'Удалить',
            mode: 'destructive',
            action: performDelete
        }]} onClose={() => setPopout(null)} title="Подтверждение действия"
                         description={`Удалить пользователя ${userToDelete.first_name} ${userToDelete.last_name}?`}/>);
    };
    const openUserMenu = (event: React.MouseEvent<HTMLElement>, user: User) => {
        const handleCloseSheet = () => setActiveSheet(null);
        setActiveSheet(<ActionSheet onClose={handleCloseSheet}
                                    iosCloseItem={<ActionSheetItem mode="cancel">Отмена</ActionSheetItem>}
                                    toggleRef={event.currentTarget}> {user.is_expert && (
            <ActionSheetItem onClick={() => routeNavigator.push(`/expert/${user.vk_id}`)}>Посмотреть
                профиль</ActionSheetItem>)} <ActionSheetItem mode="destructive"
                                                             onClick={() => handleDeleteUser(user)}>Удалить</ActionSheetItem> {platform !== Platform.IOS && (
            <ActionSheetItem mode="cancel">Отмена</ActionSheetItem>)} </ActionSheet>);
    };
    const openPromoCodeModal = (promo: any | null) => {
        setSelectedPromoCode(promo);
        setActiveModal('promo-edit-modal');
    };
    const handleSavePromoCode = async (promoData: any) => {
        setPopout(<ScreenSpinner state="loading"/>);
        try {
            if (promoData.id) {
                await apiPut(`/promo/admin/${promoData.id}`, promoData);
            } else {
                await apiPost('/promo/admin', promoData);
            }
            setActiveModal(null);
            fetchPromoCodes(true);
        } catch (err) {
            showErrorSnackbar((err as Error).message);
        } finally {
            setPopout(null);
        }
    };
    const handleDeletePromoCode = async (promoId: number) => {
        const performDelete = async () => {
            setPopout(<ScreenSpinner state="loading"/>);
            try {
                await apiDelete(`/promo/admin/${promoId}`);
                setActiveModal(null);
                fetchPromoCodes(true);
            } catch (err) {
                showErrorSnackbar((err as Error).message);
            } finally {
                setPopout(null);
            }
        };
        setPopout(<Alert actions={[{title: 'Отмена', mode: 'cancel'}, {
            title: 'Удалить',
            mode: 'destructive',
            action: performDelete
        }]} onClose={() => setPopout(null)} title="Подтверждение"
                         description="Вы уверены, что хотите удалить этот промокод?"/>);
    };

    const openPromoMenu = (event: React.MouseEvent<HTMLElement>, promo: any) => {
        setSelectedPromoCode(promo);
        const handleCloseSheet = () => setActiveSheet(null);
        setActiveSheet(
            <ActionSheet onClose={handleCloseSheet}
                         iosCloseItem={<ActionSheetItem mode="cancel">Отмена</ActionSheetItem>}
                         toggleRef={event.currentTarget}>
                <ActionSheetItem onClick={() => setActiveModal('promo-details-modal')}>Детали</ActionSheetItem>
                <ActionSheetItem onClick={() => setActiveModal('promo-edit-modal')}>Редактировать</ActionSheetItem>
                {platform !== Platform.IOS && <ActionSheetItem mode="cancel">Отмена</ActionSheetItem>}
            </ActionSheet>
        );
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={closeModal}>
            <ModalPage id='expert-details' onClose={closeModal} header={<ModalPageHeader
                after={<PanelHeaderButton onClick={closeModal}><Icon24Cancel/></PanelHeaderButton>}>Заявка
                эксперта</ModalPageHeader>}>
                {selectedExpert &&
                    <Group><SimpleCell multiline before={<Avatar size={72} src={selectedExpert.photo_url}/>}><InfoRow
                        header="Имя">{selectedExpert.first_name} {selectedExpert.last_name}</InfoRow></SimpleCell><SimpleCell
                        multiline><InfoRow header="Регион">{selectedExpert.region}</InfoRow></SimpleCell><SimpleCell
                        multiline><InfoRow header="Регалии">{selectedExpert.regalia}</InfoRow></SimpleCell><Div><InfoRow
                        header="Темы"><Text>{selectedExpert.topics.join(', ')}</Text></InfoRow></Div><SimpleCell
                        multiline href={selectedExpert.social_link} target="_blank"><InfoRow
                        header="Соц. сеть">Перейти</InfoRow></SimpleCell><SimpleCell multiline
                                                                                     href={selectedExpert.performance_link}
                                                                                     target="_blank"><InfoRow
                        header="Выступление">Посмотреть</InfoRow></SimpleCell><Div
                        style={{display: 'flex', gap: '8px'}}><Button size="l" stretched mode="primary"
                                                                      onClick={() => handleExpertAction(selectedExpert.vk_id, 'approve')}>Одобрить</Button><Button
                        size="l" stretched appearance="negative"
                        onClick={() => handleExpertAction(selectedExpert.vk_id, 'reject')}>Отклонить</Button></Div></Group>}
            </ModalPage>
            <ModalPage id='event-details' onClose={closeModal} header={<ModalPageHeader
                after={<PanelHeaderButton onClick={closeModal}><Icon24Cancel/></PanelHeaderButton>}>Заявка на
                мероприятие</ModalPageHeader>}>
                {selectedEvent && <Group><SimpleCell multiline><InfoRow header="Название">{selectedEvent.name}</InfoRow></SimpleCell><SimpleCell
                    multiline><InfoRow header="Промо-слово">{selectedEvent.promo_word}</InfoRow></SimpleCell><SimpleCell
                    multiline><InfoRow header="ID эксперта">{selectedEvent.expert_id}</InfoRow></SimpleCell><SimpleCell
                    multiline><InfoRow
                    header="Длительность">{selectedEvent.duration_minutes} мин.</InfoRow></SimpleCell><SimpleCell
                    multiline><InfoRow
                    header="Дата начала">{new Date(selectedEvent.event_date).toLocaleString('ru-RU')}</InfoRow></SimpleCell><SimpleCell
                    multiline href={selectedEvent.event_link} target="_blank"
                    disabled={!selectedEvent.event_link}><InfoRow
                    header="Ссылка на трансляцию">{selectedEvent.event_link ? "Перейти" : "Не указана"}</InfoRow></SimpleCell><Div
                    style={{display: 'flex', gap: '8px'}}><Button size="l" stretched mode="primary"
                                                                  onClick={() => handleEventAction(selectedEvent.id, 'approve')}>Одобрить</Button><Button
                    size="l" stretched appearance="negative"
                    onClick={() => handleEventAction(selectedEvent.id, 'reject')}>Отклонить</Button></Div></Group>}
            </ModalPage>
            <PromoCodeEditModal id="promo-edit-modal" promoCode={selectedPromoCode} onClose={() => setActiveModal(null)}
                                onSave={handleSavePromoCode} onDelete={handleDeletePromoCode}/>
            <PromoCodeDetailsModal id="promo-details-modal" promoCode={selectedPromoCode}
                                   onClose={() => setActiveModal(null)}/>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            {activeSheet}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()}/>}>Панель
                Администратора</PanelHeader>
            <Tabs>
                <TabsItem selected={selectedTab === 'moderation'}
                          onClick={() => setSelectedTab('moderation')}>Модерация</TabsItem>
                <TabsItem selected={selectedTab === 'users'}
                          onClick={() => setSelectedTab('users')}>Пользователи</TabsItem>
                <TabsItem selected={selectedTab === 'promo'}
                          onClick={() => setSelectedTab('promo')}>Промокоды</TabsItem>
            </Tabs>

            <div style={{display: selectedTab === 'moderation' ? 'block' : 'none', paddingBottom: 60}}>
                <Group header={<Header>Заявки на регистрацию экспертов</Header>}>{loadingModeration ?
                    <Spinner/> : (expertRequests.length === 0 ?
                        <Placeholder title="Новых заявок нет"/> : expertRequests.map((req) => <RequestCard
                            key={req.vk_id} request={req} type="expert"
                            onClick={() => openExpertRequest(req)}/>))}</Group>
                <Group header={<Header>Заявки на создание мероприятий</Header>}>{loadingModeration ?
                    <Spinner/> : (eventRequests.length === 0 ?
                        <Placeholder title="Новых заявок нет"/> : eventRequests.map((req) => <RequestCard key={req.id}
                                                                                                          request={req}
                                                                                                          type="event"
                                                                                                          onClick={() => openEventRequest(req)}/>))}</Group>
            </div>
            <div style={{display: selectedTab === 'users' ? 'block' : 'none', paddingBottom: 60}}>
                <Group><Search value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)}
                               placeholder="Поиск по имени, фамилии или ID"/><FormLayoutGroup
                    mode="horizontal"><FormItem top="Тип пользователя"><Select value={usersFilter.type}
                                                                               onChange={(e) => setUsersFilter(prev => ({
                                                                                   ...prev,
                                                                                   type: e.target.value
                                                                               }))} options={[{
                    label: 'Все',
                    value: 'all'
                }, {label: 'Только эксперты', value: 'expert'}, {
                    label: 'Только пользователи',
                    value: 'user'
                }]}/></FormItem><FormItem top="Сортировка по дате"><Select value={usersFilter.date}
                                                                           onChange={(e) => setUsersFilter(prev => ({
                                                                               ...prev,
                                                                               date: e.target.value
                                                                           }))} options={[{
                    label: 'Сначала новые',
                    value: 'desc'
                }, {label: 'Сначала старые', value: 'asc'}]}/></FormItem></FormLayoutGroup></Group>
                <Group header={<Header>Список пользователей</Header>}>{users.map((user) => (
                    <SimpleCell key={user.vk_id} before={<Avatar size={48} src={user.photo_url}/>}
                                after={<IconButton onClick={(e) => openUserMenu(e, user)}
                                                   aria-label="Действия с пользователем"><Icon28MoreVertical/></IconButton>}
                                subtitle={user.is_expert ? `Эксперт (статус: ${user.status || 'approved'})` : 'Пользователь'}>{user.first_name} {user.last_name}</SimpleCell>))}
                    <div ref={usersObserverRef} style={{height: '1px'}}/>
                    {loadingUsers &&
                        <Spinner size="l" style={{margin: '20px 0'}}/>}{!loadingUsers && users.length === 0 &&
                        <Placeholder icon={<Icon56UsersOutline/>} title="Пользователи не найдены"/>}</Group>
            </div>
            <div style={{display: selectedTab === 'promo' ? 'block' : 'none', paddingBottom: 60}}>
                <Group><Div><Button stretched size="l" mode="secondary" onClick={() => openPromoCodeModal(null)}>Создать
                    промокод</Button></Div></Group>
                <Group header={<Header>Список промокодов</Header>}>
                    {promoCodes.map((promo) => (
                        <PromoCodeCard key={promo.id} promoCode={promo} onMenuClick={openPromoMenu}/>))}
                    <div ref={promoObserverRef} style={{height: '1px'}}/>
                    {loadingPromoCodes && <Spinner size="l" style={{margin: '20px 0'}}/>}
                    {!loadingPromoCodes && promoCodes.length === 0 && <Placeholder title="Промокоды не найдены"/>}
                </Group>
            </div>
        </Panel>
    );
};