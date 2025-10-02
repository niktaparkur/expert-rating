import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, SimpleCell, Button, ScreenSpinner, Spinner, Div, Text } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const API_URL = 'https://p.potokrechi.ru/api/v1';

export const Admin = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [popout, setPopout] = useState(null);

    useEffect(() => {
        async function fetchRequests() {
            setPopout(<ScreenSpinner state="loading" />);
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/experts/admin/pending`);
                if (!response.ok) throw new Error('Ошибка при загрузке заявок');
                const data = await response.json();
                setRequests(data);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching requests', err);
            } finally {
                setLoading(false);
            }
        }
        fetchRequests();
    }, []);

    const handleAction = async (vkId, action) => {
        try {
            const response = await fetch(`${API_URL}/experts/admin/${vkId}/${action}`, { method: 'POST' });
            if (!response.ok) throw new Error(`Не удалось выполнить действие: ${action}`);
            setRequests(prev => prev.filter(req => req.vk_id !== vkId));
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <Panel id={id}>
            <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                Модерация заявок
            </PanelHeader>
            <Group>
                {loading && <Spinner />}
                {error && <Div><Text style={{ color: 'red' }}>{error}</Text></Div>}
                {!loading && !error && requests.length === 0 && <Div><Text>Новых заявок нет</Text></Div>}
                {requests.map(req => (
                    <SimpleCell
                        key={req.vk_id}
                        before={<img src={req.photo_url} width={48} style={{ borderRadius: '50%' }} alt="" />}
                        description={req.regalia}
                        after={
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button size="s" mode="primary" onClick={() => handleAction(req.vk_id, 'approve')}>Одобрить</Button>
                                <Button size="s" mode="destructive" onClick={() => handleAction(req.vk_id, 'reject')}>Отклонить</Button>
                            </div>
                        }
                    >
                        {req.first_name} {req.last_name}
                    </SimpleCell>
                ))}
            </Group>
        </Panel>
    );
};