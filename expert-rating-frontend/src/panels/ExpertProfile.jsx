import React, { useState, useEffect } from 'react';
import {
    Panel,
    PanelHeader,
    PanelHeaderBack,
    Group,
    Button,
    Spinner,
    Div,
    Text,
    ModalRoot,
    ModalCard,
    ScreenSpinner
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';

import { ExpertProfileCard } from '../components/ExpertProfileCard.jsx';
import { VoteCard } from '../components/VoteCard.jsx';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const ExpertProfile = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const { expertId } = useParams();
    const [expert, setExpert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [voterId, setVoterId] = useState(null);
    const [popout, setPopout] = useState(null); // Для ScreenSpinner

    useEffect(() => {
        bridge.send('VKWebAppGetUserInfo').then(user => user && setVoterId(user.id));
        if (!expertId) return;

        async function fetchExpert() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/experts/${expertId}`);
                if (!response.ok) throw new Error('Не удалось загрузить профиль эксперта');
                const data = await response.json();
                setExpert(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchExpert();
    }, [expertId]);

    const handleNarodVoteSubmit = async (voteData) => {
        if (!voterId) { alert('Не удалось определить ваш ID'); return; }
        setActiveModal(null);
        setPopout(<ScreenSpinner state="loading" />);
        try {
            const response = await fetch(`${API_URL}/experts/${expertId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...voteData, voter_vk_id: voterId })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка голосования');
            }
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
                <VoteCard
                    title="Народное голосование"
                    subtitle="Ваш голос и отзыв помогут другим."
                    onSubmit={handleNarodVoteSubmit}
                />
            </ModalCard>
        </ModalRoot>
    );

    if (loading) {
        return <Panel id={id}><Spinner /></Panel>;
    }
    if (error) {
        return <Panel id={id}><Div><Text style={{ color: 'red' }}>{error}</Text></Div></Panel>;
    }

    return (
        <Panel id={id} popout={popout}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Профиль эксперта
            </PanelHeader>
            {expert && (
                <>
                    <Group>
                        <ExpertProfileCard expert={expert} />
                    </Group>
                    <Div>
                        <Button size="l" stretched onClick={() => setActiveModal('narod-vote-modal')}>
                            Проголосовать (Народный рейтинг)
                        </Button>
                    </Div>
                    <Div>
                        <Button size="l" stretched mode="secondary">
                            Мероприятия эксперта
                        </Button>
                    </Div>
                </>
            )}
        </Panel>
    );
};