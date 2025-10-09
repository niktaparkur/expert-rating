import React, { useState, useEffect } from 'react';
import {
    Card, Panel, PanelHeader, PanelHeaderBack, Group, Spinner, Div, Text, ModalRoot, ModalCard, Tabs, TabsItem, Placeholder,     SegmentedControl

} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { useApi } from '../hooks/useApi.js';
import { ExpertProfileCard } from '../components/ExpertProfileCard.jsx';
import { VoteCard } from '../components/VoteCard.jsx';
import { Icon56CalendarOutline } from '@vkontakte/icons';



const EventListCard = ({ event }) => {
    return (
        <Card mode="shadow">
            <Div>
                <Text weight="1" style={{ marginBottom: '8px' }}>{event.name}</Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                    {new Date(event.event_date + 'Z').toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
                </Text>
            </Div>
        </Card>
    );
};

export const ExpertProfile = ({ id, setPopout }) => {
    const routeNavigator = useRouteNavigator();
    const { expertId } = useParams();
    const { apiGet, apiPost } = useApi();

    const [expert, setExpert] = useState(null);
    const [events, setEvents] = useState({ current: [], past: [] });
    const [loading, setLoading] = useState({ profile: true, events: true });
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [voterId, setVoterId] = useState(null);
    const [activeTab, setActiveTab] = useState('current');


    useEffect(() => {
        bridge.send('VKWebAppGetUserInfo').then(user => user && setVoterId(user.id));
        if (!expertId) return;

        async function fetchData() {
            setLoading({ profile: true, events: true });
            setError(null);
            try {
                const [profileData, eventsData] = await Promise.all([
                    apiGet(`/experts/${expertId}`),
                    apiGet(`/events/expert/${expertId}`)
                ]);
                setExpert(profileData);
                setEvents(eventsData);
            } catch (err) {
                setError(err.message);
                console.error(err);
            } finally {
                setLoading({ profile: false, events: false });
            }
        }
        fetchData();
    }, [expertId, apiGet]);

    const handleNarodVoteSubmit = async (voteData) => {
        if (!voterId) { alert('Не удалось определить ваш ID'); return; }
        setActiveModal(null);
        setPopout(<Spinner size="large" />);
        try {
            await apiPost(`/experts/${expertId}/vote`, { ...voteData, voter_vk_id: voterId });
            alert('Спасибо, ваш голос учтен!');
        } catch (err) {
            alert(err.message);
        } finally {
            setPopout(null);
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalCard id="narod-vote-modal" onClose={() => setActiveModal(null)}>
                <VoteCard title="Народное голосование" subtitle="Ваш голос и отзыв помогут другим." onSubmit={handleNarodVoteSubmit} voteType="narod" />
            </ModalCard>
        </ModalRoot>
    );

    const showFutureFeatureAlert = () => {
        setPopout(
             <div onClick={() => setPopout(null)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{ background: 'var(--vkui--color_background_content)', padding: '10px 20px', borderRadius: 8}}>
                    <Text>Функция в разработке</Text>
                </div>
            </div>
        )
    };

    if (loading.profile) {
        return <Panel id={id}><div style={{ paddingTop: 20, textAlign: 'center' }}><Spinner /></div></Panel>;
    }
    if (error) {
        return <Panel id={id}><Div><Text style={{ color: 'red' }}>{error}</Text></Div></Panel>;
    }

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Профиль эксперта
            </PanelHeader>
            {expert && (
                <>
                    <Group>
                        <ExpertProfileCard
                            expert={expert}
                            onVoteClick={() => setActiveModal('narod-vote-modal')}
                            onFutureFeatureClick={showFutureFeatureAlert}
                        />
                    </Group>

                    <Group>
                        <SegmentedControl
                            value={activeTab}
                            onChange={(value) => setActiveTab(String(value))}
                            options={[
                                { label: 'Текущие', value: 'current' },
                                { label: 'Завершенные', value: 'past' },
                            ]}
                        />
                        <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {loading.events && <Spinner />}

                            {!loading.events && activeTab === 'current' && (
                                events.current.length > 0
                                    ? events.current.map(event => <EventListCard key={event.id} event={event} />)
                                    : <Placeholder icon={<Icon56CalendarOutline />} header="Нет предстоящих мероприятий" />
                            )}

                            {!loading.events && activeTab === 'past' && (
                                events.past.length > 0
                                    ? events.past.map(event => <EventListCard key={event.id} event={event} />)
                                    : <Placeholder icon={<Icon56CalendarOutline />} header="Нет завершенных мероприятий" />
                            )}
                        </Div>
                    </Group>
                </>
            )}
        </Panel>
    );
};