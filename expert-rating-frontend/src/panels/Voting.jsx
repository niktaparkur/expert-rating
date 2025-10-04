import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, ScreenSpinner, FormItem, FormField, Input, Div, Spinner, Text } from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { VoteCard } from '../components/VoteCard.jsx';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const Voting = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const { promo } = useParams();
    const [popout, setPopout]      = useState(null);
    const [voterId, setVoterId]    = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]        = useState(null);
    const [voted, setVoted]        = useState(false); // Новое состояние: уже проголосовал?

    // Получаем ID пользователя при первой загрузке
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
            const response = await fetch(`${API_URL}/events/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Специально обрабатываем ошибку "уже проголосовал"
                if (errorData.detail && errorData.detail.includes("already voted")) {
                    setVoted(true); // Показываем карточку "уже проголосовал"
                } else {
                    throw new Error(errorData.detail || 'Не удалось проголосовать');
                }
            } else {
                setVoted(true); // Показываем карточку "уже проголосовал" после успешного голоса
            }
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setPopout(null);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <Spinner />;
        }
        if (error) {
            return <Div><Text style={{color: 'red'}}>{error}</Text></Div>;
        }
        return (
            <>
                <FormItem top="Промо-слово">
                    <FormField><Input value={promo || ''} disabled /></FormField>
                </FormItem>
                <VoteCard
                    title="Голосование на мероприятии"
                    subtitle="Ваш голос будет засчитан в экспертный рейтинг."
                    onSubmit={handleEventVoteSubmit}
                    disabled={popout !== null} // Блокируем, пока идет отправка
                    voted={voted} // Передаем состояние "уже проголосовал"
                    voteType="expert" // Указываем тип для текста
                />
            </>
        );
    };

    return (
        <Panel id={id} popout={popout}>
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Голосование
            </PanelHeader>
            <Group>
                {renderContent()}
            </Group>
        </Panel>
    );
};