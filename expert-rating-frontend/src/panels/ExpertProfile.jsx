// src/panels/ExpertProfile.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel,
    PanelHeader,
    PanelHeaderBack,
    Group,
    Spinner,
    Div,
    Text,
    ModalRoot,
    ModalPage,
    ModalPageHeader,
    Placeholder,
    SegmentedControl,
    Snackbar,
    Avatar,
    Header,
    SimpleCell,
    InfoRow
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi.js';
import { ExpertProfileCard } from '../components/ExpertProfileCard.jsx';
import { VoteCard } from '../components/VoteCard.jsx';
import {
    Icon56CalendarOutline,
    Icon16Done,
    Icon16Cancel,
    Icon24CalendarOutline,
    Icon24Link
} from '@vkontakte/icons';


const PublicEventCard = ({ event }) => {
    return (
        <Group mode="card" header={<Header>{event.name}</Header>}>
            <SimpleCell before={<Icon24CalendarOutline />} multiline>
                <InfoRow header="Дата">{new Date(event.event_date + 'Z').toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</InfoRow>
            </SimpleCell>
            {event.event_link && (
                <SimpleCell before={<Icon24Link />} href={event.event_link} target="_blank" expandable="true">
                    <InfoRow header="Ссылка на мероприятие">Перейти</InfoRow>
                </SimpleCell>
            )}
        </Group>
    );
};


export const ExpertProfile = ({ id, user, setPopout, setSnackbar }) => {
    const routeNavigator = useRouteNavigator();
    const { expertId } = useParams();
    const { apiGet, apiPost, apiDelete } = useApi();

    const [expert, setExpert] = useState(null);
    const [events, setEvents] = useState({ current: [], past: [] });
    const [loading, setLoading] = useState({ profile: true, events: true });
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [activeTab, setActiveTab] = useState('current');

    const isSelf = user?.vk_id === Number(expertId);
    const hasVoted = expert?.current_user_has_voted || false;

    const refetchExpert = useCallback(async () => {
        try {
            const profileData = await apiGet(`/experts/${expertId}`);
            setExpert(profileData);
        } catch (err) {
            console.error("Failed to refetch expert data:", err);
        }
    }, [apiGet, expertId]);

    useEffect(() => {
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
            } finally {
                setLoading({ profile: false, events: false });
            }
        }
        fetchData();
    }, [expertId, apiGet]);

    const handleVoteClick = () => {
        if (isSelf) {
            setSnackbar(
                <Snackbar
                    onClose={() => setSnackbar(null)}
                    before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_negative)' }}><Icon16Cancel fill="#fff" width={14} height={14} /></Avatar>}
                >
                    Вы не можете голосовать за себя.
                </Snackbar>
            );
            return;
        }
        setActiveModal('narod-vote-modal');
    };

    const handleVoteSubmit = async (voteData) => {
        if (!user?.vk_id) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Не удалось определить ваш ID</Snackbar>);
            return;
        }

        if (!voteData.vote_type) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>Пожалуйста, выберите "Доверяю" или "Не доверяю".</Snackbar>);
            return;
        }

        if (voteData.vote_type === 'distrust' && !voteData.comment.trim()) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>При выборе "Не доверяю" комментарий обязателен.</Snackbar>);
            return;
        }

        setActiveModal(null);
        setPopout(<Spinner size="l" />);

        const finalData = {
            voter_vk_id: user.vk_id,
            vote_type: voteData.vote_type,
            comment_positive: voteData.vote_type === 'trust' ? voteData.comment : null,
            comment_negative: voteData.vote_type === 'distrust' ? voteData.comment : null,
        };

        try {
            await apiPost(`/experts/${expertId}/vote`, finalData);
            await refetchExpert();
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>Спасибо, ваш голос учтен!</Snackbar>);
        } catch (err) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{err.message}</Snackbar>);
        } finally {
            setPopout(null);
        }
    };

    const handleCancelVote = async () => {
        setActiveModal(null);
        setPopout(<Spinner size="l" />);
        try {
            await apiDelete(`/experts/${expertId}/vote`);
            await refetchExpert();
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>Ваш голос был отменен.</Snackbar>);
        } catch (err) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{err.message}</Snackbar>);
        } finally {
            setPopout(null);
        }
    };

    const showFutureFeatureAlert = () => {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Функция в разработке</Snackbar>);
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage id="narod-vote-modal" onClose={() => setActiveModal(null)} header={<ModalPageHeader>Народное голосование</ModalPageHeader>}>
                <VoteCard
                    onSubmit={handleVoteSubmit}
                    onCancelVote={handleCancelVote}
                    hasVoted={hasVoted}
                />
            </ModalPage>
        </ModalRoot>
    );

    if (loading.profile) {
        return <Panel id={id}><Spinner /></Panel>;
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
                            onVoteClick={handleVoteClick}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px' }}>
                            {loading.events && <Spinner />}

                            {!loading.events && activeTab === 'current' && (
                                events.current.length > 0
                                    ? events.current.map(event => <PublicEventCard key={event.id} event={event} />)
                                    : <Placeholder icon={<Icon56CalendarOutline />} header="Нет предстоящих мероприятий" />
                            )}

                            {!loading.events && activeTab === 'past' && (
                                events.past.length > 0
                                    ? events.past.map(event => <PublicEventCard key={event.id} event={event} />)
                                    : <Placeholder icon={<Icon56CalendarOutline />} header="Нет завершенных мероприятий" />
                            )}
                        </div>
                    </Group>
                </>
            )}
        </Panel>
    );
};