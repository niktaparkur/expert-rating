import React, { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, Button, Group, Header, Div, CardGrid, Spinner, Text
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { ExpertCard } from '../components/ExpertCard.jsx';
import { useApi } from '../hooks/useApi.js';

export const Home = ({ id, user }) => {
    const routeNavigator = useRouteNavigator();
    const { apiGet } = useApi();
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchTopExperts() {
            setLoading(true);
            setError(null);
            try {
                const data = await apiGet('/experts/top');
                setExperts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTopExperts();
    }, [apiGet]);

    const renderHeaderButtons = () => {
        if (!user) return null;
        if (!user.is_expert && user.status !== 'pending') {
            return <Button onClick={() => routeNavigator.push('/registration')}>Стать экспертом</Button>;
        }
        return null;
    };

    return (
        <Panel id={id}>
            <PanelHeader after={renderHeaderButtons()}>
                Рейтинг Экспертов
            </PanelHeader>

            <Group header={<Header>Топ экспертов</Header>}>
                {loading && <div style={{ paddingTop: 20, textAlign: 'center' }}><Spinner /></div>}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && (
                    <CardGrid size="l" style={{ padding: 0, margin: '0 8px', paddingBottom: '60px' }}>
                        {experts.length === 0 ? <Div><Text>Пока нет одобренных экспертов.</Text></Div> :
                         experts.map((expert, index) => (
                            <ExpertCard
                                key={expert.vk_id}
                                expert={expert}
                                topPosition={index + 1}
                                onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
                            />
                        ))}
                    </CardGrid>
                )}
            </Group>
        </Panel>
    );
};