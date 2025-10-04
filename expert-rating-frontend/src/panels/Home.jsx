import React, { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, Button, Group, Header, Div, CardGrid, Card,
    Avatar, ContentBadge, Title, Text, Spinner
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const Home = ({ id }) => {
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
            <PanelHeader>Рейтинг экспертов</PanelHeader>
            <Group>
                <Header
                    aside={<Button onClick={() => routeNavigator.push('/registration')}>Стать экспертом</Button>}
                >
                    Топ экспертов
                </Header>
                {loading && <Spinner />}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && (
                    <CardGrid size="l">
                        {experts.length === 0 ? <Div><Text>Пока нет одобренных экспертов.</Text></Div> :
                         experts.map(expert => (
                            <Card
                                key={expert.vk_id}
                                mode="shadow"
                                hoverMode="shadow"
                                onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
                            >
                                <Div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Avatar size={48} src={expert.photo_url} />
                                    <div style={{ marginLeft: '12px' }}>
                                        <Title level="3" style={{ marginBottom: '4px' }}>{expert.first_name} {expert.last_name}</Title>
                                        {/* TODO: Добавить реальный рейтинг */}
                                        <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Рейтинг: 100</Text>
                                    </div>
                                </Div>
                                {/* TODO: Добавить реальные темы */}
                                <Div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: 0 }}>
                                    <ContentBadge mode="secondary">Тема 1</ContentBadge>
                                    <ContentBadge mode="secondary">Тема 2</ContentBadge>
                                </Div>
                            </Card>
                        ))}
                    </CardGrid>
                )}
            </Group>
        </Panel>
    );
};