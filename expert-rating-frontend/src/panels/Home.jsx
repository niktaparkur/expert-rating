// src/panels/Home.jsx
import React, { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, Button, Group, Header, Div, CardGrid, Spinner, Text,
    PanelHeaderContent, Avatar
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { ExpertCard } from '../components/ExpertCard.jsx';
import { Icon24Add } from '@vkontakte/icons';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const Home = ({ id, setPopout }) => { // Принимаем setPopout для будущих алертов
    const routeNavigator = useRouteNavigator();
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchTopExperts() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/experts/top`);
                if (!response.ok) throw new Error('Не удалось загрузить список экспертов');
                const data = await response.json();
                setExperts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTopExperts();
    }, []);

    return (
        <Panel id={id}>
            <PanelHeader>
                <PanelHeaderContent
                    before={<Header mode="primary">Рейтинг Экспертов</Header>}
                    after={<Button onClick={() => routeNavigator.push('/registration')}>Стать экспертом</Button>}
                />
            </PanelHeader>

            <Group header={<Header>Топ экспертов</Header>}>
                {loading && <Spinner />}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && (
                    <CardGrid size="l">
                        {experts.length === 0 ? <Div><Text>Пока нет одобренных экспертов.</Text></Div> :
                         experts.map(expert => (
                            <ExpertCard
                                key={expert.vk_id}
                                expert={{
                                    ...expert,
                                    rating: expert.stats?.expert || 0 // Берем реальный рейтинг или 0
                                }}
                                onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
                            />
                        ))}
                    </CardGrid>
                )}
            </Group>
        </Panel>
    );
};