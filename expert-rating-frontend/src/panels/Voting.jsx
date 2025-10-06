import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, ScreenSpinner, FormItem, FormField, Input, Div, Spinner, Text } from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { VoteCard } from '../components/VoteCard.jsx';
import { useApi } from '../hooks/useApi.js';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const Voting = ({ id, setPopout }) => {
    const routeNavigator = useRouteNavigator();
    const { promo } = useParams();
    const { apiPost } = useApi();
    const [voterId, setVoterId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [voted, setVoted] = useState(false);
    const [adShown, setAdShown] = useState(false);

    useEffect(() => {
        if (!adShown) {
            setAdShown(true);

            bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
                .catch(error => console.error('Ad error:', error));
        }
    }, [adShown]);

    useEffect(() => {
        bridge.send('VKWebAppGetUserInfo')
            .then(user => {
                if (user && user.id) setVoterId(user.id);
            })
            .catch(err => setError('Не удалось получить ваш VK ID.'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleEventVoteSubmit = async (voteData) => {
        if (!voterId) {
            alert('Не удалось определить ваш VK ID.');
            return;
        }
        setPopout(<ScreenSpinner state="loading" />);
        const finalData = {
            ...voteData,
            promo_word: promo,
            voter_vk_id: voterId
        };
        try {
            await apiPost('/events/vote', finalData);
            setVoted(true);
        } catch (error) {
            if (error.message && error.message.includes("already voted")) {
                setVoted(true);
            } else {
                alert(`Ошибка: ${error.message}`);
            }
        } finally {
            setPopout(null); // Используем setPopout из props
        }
    };

    const renderContent = () => {
        if (isLoading) return <Spinner />;
        if (error) return <Div><Text style={{color: 'red'}}>{error}</Text></Div>;
        return (
            <>
                <FormItem top="Промо-слово">
                    <FormField><Input value={promo || ''} disabled /></FormField>
                </FormItem>
                <VoteCard
                    title="Голосование на мероприятии"
                    subtitle="Ваш голос будет засчитан в экспертный рейтинг."
                    onSubmit={handleEventVoteSubmit}
                    voted={voted}
                    voteType="expert"
                />
            </>
        );
    };

    return (
        <Panel id={id}>
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Голосование
            </PanelHeader>
            <Group>
                {renderContent()}
            </Group>
        </Panel>
    );
};