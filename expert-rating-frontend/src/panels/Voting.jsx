// src/panels/Voting.jsx

import React, { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Group, Spinner, Div, Text,
    ModalRoot, ModalPage, ModalPageHeader, Placeholder, Button, Header, Snackbar
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi.js';
import { MiniExpertProfile } from '../components/MiniExpertProfile.jsx';
import { VoteCard } from '../components/VoteCard.jsx';
import { Icon56CheckCircleOutline, Icon56ErrorTriangleOutline, Icon56RecentOutline } from '@vkontakte/icons';

export const Voting = ({ id, user, setPopout, setSnackbar }) => {
    const routeNavigator = useRouteNavigator();
    const { promo } = useParams();
    const { apiGet, apiPost } = useApi();

    const [eventData, setEventData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [alreadyVoted, setAlreadyVoted] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    useEffect(() => {
        if (!promo) return;
        setIsLoading(true);
        apiGet(`/events/status/${promo}`)
            .then(data => setEventData(data))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [promo, apiGet]);

    const handleEventVoteSubmit = async (voteData) => {
        if (!user?.vk_id) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Не удалось определить ваш ID.</Snackbar>);
            return;
        }
        if (!voteData.vote_type) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Пожалуйста, выберите "Доверяю" или "Не доверяю".</Snackbar>);
            return;
        }
        if (voteData.vote_type === 'distrust' && !voteData.comment.trim()) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>При выборе "Не доверяю" комментарий обязателен.</Snackbar>);
            return;
        }

        setPopout(<Spinner size="l" />);
        const finalData = {
            promo_word: promo,
            voter_vk_id: user.vk_id,
            vote_type: voteData.vote_type,
            comment_positive: voteData.vote_type === 'trust' ? voteData.comment : null,
            comment_negative: voteData.vote_type === 'distrust' ? voteData.comment : null,
        };

        try {
            await apiPost('/events/vote', finalData);
            setActiveModal('vote-success-modal');
        } catch (err) {
            if (err.message.includes("already voted")) {
                setAlreadyVoted(true);
            } else {
                setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{err.message}</Snackbar>);
            }
        } finally {
            setPopout(null);
        }
    };

    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (error) return <Placeholder icon={<Icon56ErrorTriangleOutline />} header="Ошибка">{error}</Placeholder>;
        if (!eventData) return <Placeholder header="Загрузка..." />;
        if (alreadyVoted) return <Placeholder icon={<Icon56CheckCircleOutline />} header="Вы уже проголосовали">Ваш голос на этом мероприятии учтен.</Placeholder>;

        if (eventData.current_user_has_voted) {
            return <Placeholder icon={<Icon56CheckCircleOutline />} header="Вы уже проголосовали">Ваш голос на этом мероприятии учтен.</Placeholder>;
        }

        switch (eventData.status) {
            case 'active':
                return (
                    <>
                        <Group header={<Header mode="secondary">Эксперт мероприятия</Header>}>
                            <MiniExpertProfile expert={eventData.expert} />
                        </Group>
                        <VoteCard onSubmit={handleEventVoteSubmit} />
                    </>
                );
            case 'not_started':
                const startTime = new Date(eventData.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                return <Placeholder icon={<Icon56RecentOutline />} header="Голосование еще не началось">{`Начало голосования: ${startTime}`}</Placeholder>;
            case 'finished':
                return <Placeholder icon={<Icon56RecentOutline />} header="Голосование завершено">Вы больше не можете оставить свой голос на этом мероприятии.</Placeholder>;
            case 'not_found':
            default:
                return <Placeholder icon={<Icon56ErrorTriangleOutline />} header="Мероприятие не найдено">Проверьте правильность введенного промо-слова.</Placeholder>;
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage id="vote-success-modal" onClose={() => setActiveModal(null)} header={<ModalPageHeader>Голос принят!</ModalPageHeader>}>
                <Placeholder
                    icon={<Icon56CheckCircleOutline style={{ color: 'var(--vkui--color_icon_positive)' }} />}
                    header="Спасибо, ваш голос учтен!"
                    action={
                        <Button size="l" mode="primary" onClick={() => routeNavigator.push(`/expert/${eventData?.expert?.vk_id}`)}>
                            Перейти к профилю эксперта
                        </Button>
                    }
                >
                    Он будет засчитан в экспертный рейтинг. Если вы передумали, вы можете отменить свой голос в профиле эксперта.
                </Placeholder>
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Голосование
            </PanelHeader>
            {renderContent()}
        </Panel>
    );
};