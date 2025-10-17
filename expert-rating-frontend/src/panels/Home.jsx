import React, { useState, useEffect, useMemo } from 'react';
import {
    Panel,
    PanelHeader,
    Button,
    Group,
    Header,
    Div,
    CardGrid,
    Spinner,
    Text,
    Search,
    Placeholder
} from '@vkontakte/vkui';
import { Icon56UsersOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { ExpertCard } from '../components/ExpertCard.tsx';
import { useApi } from '../hooks/useApi.js';

export const Home = ({ id, user }) => {
    const routeNavigator = useRouteNavigator();
    const { apiGet } = useApi();
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchTopExperts() {
            setLoading(true);
            setError(null);
            try {
                const data = await apiGet('/experts/top');
                const expertsWithPosition = data.map((expert, index) => ({
                    ...expert,
                    topPosition: index + 1,
                }));
                setExperts(expertsWithPosition);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTopExperts();
    }, [apiGet]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const filteredExperts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            return experts;
        }
        return experts.filter(expert => {
            const fullName = `${expert.first_name} ${expert.last_name}`.toLowerCase();
            const topicsMatch = expert.topics.some(topic => topic.toLowerCase().includes(query));
            return fullName.includes(query) || topicsMatch;
        });
    }, [searchQuery, experts]);



    return (
        <Panel id={id}>
            <PanelHeader>
                Рейтинг Экспертов
            </PanelHeader>

            <Group>
                <Search
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Поиск по имени или направлению"
                />
            </Group>

            <Group header={<Header>Топ экспертов</Header>}>
                {loading && <Spinner />}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && (
                    <>
                        {filteredExperts.length > 0 ? (
                            <CardGrid size="l" style={{ padding: 0, margin: '0 8px', paddingBottom: '60px' }}>
                                {filteredExperts.map((expert) => (
                                    <ExpertCard
                                        key={expert.vk_id}
                                        expert={expert}
                                        topPosition={expert.topPosition}
                                        onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
                                    />
                                ))}
                            </CardGrid>
                        ) : (
                             <Placeholder
                                icon={<Icon56UsersOutline />}
                                header="Эксперты не найдены"
                             >
                                Попробуйте изменить запрос или сбросить фильтр.
                            </Placeholder>
                        )}
                    </>
                )}
            </Group>
        </Panel>
    );
};