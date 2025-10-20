import React, {useState, useEffect, useCallback} from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Group, Spinner, Placeholder,
    SegmentedControl, Snackbar, Header, Separator, ModalRoot, ModalPage, ModalPageHeader
} from '@vkontakte/vkui';
import {useRouteNavigator, useParams} from '@vkontakte/vk-mini-apps-router';
import {Icon56CalendarOutline, Icon16Done, Icon16Cancel} from '@vkontakte/icons';

import {useApi} from '../hooks/useApi.js';
import {ExpertProfileCard} from '../components/ExpertProfileCard.tsx';
import {VoteCard} from '../components/VoteCard.jsx';
import {EventInfoCard} from '../components/EventInfoCard';
import {groupPlannedEvents} from '../utils/groupEventsByDate';

export const ExpertProfile = ({id, user, setPopout, setSnackbar, refetchUser}) => {
    const routeNavigator = useRouteNavigator();
    const {expertId} = useParams();
    const {apiGet, apiPost} = useApi();

    const [expert, setExpert] = useState(null);
    const [events, setEvents] = useState({current: [], past: []});
    const [loading, setLoading] = useState({profile: true, events: true});
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [activeTab, setActiveTab] = useState('current');

    const isSelf = user?.vk_id === Number(expertId);
    const initialVote = expert?.current_user_vote_info;

    const refetchExpert = useCallback(async () => {
        try {
            const profileData = await apiGet(`/experts/${expertId}`);
            setExpert(profileData);
        } catch (err) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>Не удалось обновить
                профиль.</Snackbar>);
        }
    }, [apiGet, expertId, setSnackbar]);

    useEffect(() => {
        if (!expertId) return;

        async function fetchData() {
            setLoading({profile: true, events: true});
            setError(null);
            try {
                const [profileData, eventsData] = await Promise.all([apiGet(`/experts/${expertId}`), apiGet(`/events/expert/${expertId}`)]);
                setExpert(profileData);
                setEvents(eventsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading({profile: false, events: false});
            }
        }

        fetchData();
    }, [expertId, apiGet]);

    const handleVoteClick = () => {
        if (isSelf) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>Вы не можете голосовать за
                себя.</Snackbar>);
            return;
        }
        setActiveModal('narod-vote-modal');
    };

    const handleVoteAction = async (votePayload) => {
        setActiveModal(null);
        setPopout(<Spinner size="l"/>);
        const finalData = {voter_vk_id: user.vk_id, ...votePayload};

        try {
            await apiPost(`/experts/${expertId}/vote`, finalData);
            await Promise.all([refetchExpert(), refetchUser()]);
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done/>}>Спасибо, ваше действие
                учтено!</Snackbar>);
        } catch (err) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>{err.message}</Snackbar>);
        } finally {
            setPopout(null);
        }
    };

    const showFutureFeatureAlert = () => {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Функция в разработке</Snackbar>);
    };
    const groupedPlannedEvents = groupPlannedEvents(events.current);
    const renderGroupedEvents = (group, title) => (group.length > 0 &&
        <React.Fragment key={title}><Header>{title}</Header>{group.map(event => <EventInfoCard key={event.id}
                                                                                               event={event}
                                                                                               showContextMenu={false}
                                                                                               onMenuClick={() => {
                                                                                               }}/>)}</React.Fragment>);

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage id="narod-vote-modal" onClose={() => setActiveModal(null)}
                       header={<ModalPageHeader>Народное голосование</ModalPageHeader>} settlingHeight={100}>
                <VoteCard onSubmit={handleVoteAction} initialVote={initialVote}/>
            </ModalPage>
        </ModalRoot>
    );

    if (loading.profile) return <Panel id={id}><Spinner/></Panel>;
    if (error) return <Panel id={id}><Placeholder>{error}</Placeholder></Panel>;

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()}/>}>
                Профиль эксперта
            </PanelHeader>
            {expert && (
                <>
                    <Group>
                        <ExpertProfileCard expert={expert} onVoteClick={handleVoteClick}
                                           onFutureFeatureClick={showFutureFeatureAlert}/>
                    </Group>
                    <Group>
                        <SegmentedControl value={activeTab} onChange={(value) => setActiveTab(String(value))}
                                          options={[{label: 'Предстоящие', value: 'current'}, {
                                              label: 'Завершенные',
                                              value: 'past'
                                          }]}/>
                        <div style={{paddingBottom: '60px'}}>
                            {loading.events && <Spinner/>}
                            {!loading.events && activeTab === 'current' && (
                                events.current.length > 0 ? (
                                    <>
                                        {renderGroupedEvents(groupedPlannedEvents.today, 'Сегодня')}
                                        {renderGroupedEvents(groupedPlannedEvents.tomorrow, 'Завтра')}
                                        {renderGroupedEvents(groupedPlannedEvents.next7Days, 'Ближайшие 7 дней')}
                                        {renderGroupedEvents(groupedPlannedEvents.later, 'Позже')}
                                    </>
                                ) : (
                                    <Placeholder icon={<Icon56CalendarOutline/>} header="Нет предстоящих мероприятий"/>
                                )
                            )}
                            {!loading.events && activeTab === 'past' && (
                                events.past.length > 0 ? (
                                    events.past.map((event, index) => (
                                        <React.Fragment key={event.id}>
                                            <EventInfoCard event={event} isArchived showContextMenu={false}
                                                           onMenuClick={() => {
                                                           }}/>
                                            {index < events.past.length - 1 && <Separator/>}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <Placeholder icon={<Icon56CalendarOutline/>} header="Нет завершенных мероприятий"/>
                                )
                            )}
                        </div>
                    </Group>
                </>
            )}
        </Panel>
    );
};