import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, Group, CardScroll, Div, Text, ScreenSpinner, Button, Header, Title, SimpleCell, Card, Spinner } from '@vkontakte/vkui';
import { Icon24CheckCircleOn } from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';
import { useApi } from '../hooks/useApi';

const tariffsData = [
    { id: 'tariff_start', name: 'Начальный', price_str: 'Бесплатно', price_votes: 0, features: [ { text: 'До 3 мероприятий в месяц' }, { text: 'До 100 голосов' } ] },
    { id: 'tariff_standard', name: 'Эксперт', price_str: '299 голосов', price_votes: 299, features: [ { text: 'До 10 мероприятий в месяц' }, { text: 'До 200 голосов' }, { text: '2 рассылки в месяц' } ] },
    { id: 'tariff_pro', name: 'Профи', price_str: '729 голосов', price_votes: 729, features: [ { text: 'До 30 мероприятий в месяц' }, { text: 'До 1000 голосов' }, { text: '4 рассылки в месяц' } ] }
];

export const Tariffs = ({ id, setPopout }) => {
    const { apiGet } = useApi();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet('/users/me')
            .then(userData => setCurrentUser(userData))
            .catch(err => console.error("Failed to fetch user:", err))
            .finally(() => setLoading(false));
    }, [apiGet]);

    const handleSelectTariff = async (tariff) => {
        if (tariff.price_votes === 0) return;

        setPopout(<ScreenSpinner state="loading" />);
        try {
            const result = await bridge.send('VKWebAppShowOrderBox', {
                type: 'item',
                item: tariff.id
            });

            if (result.success) {
                 alert('Окно покупки открыто. После успешной оплаты ваш тариф будет обновлен.');
            } else {
                console.log('Order box returned error:', result);
            }

        } catch (error) {
            if (error.error_data && error.error_data.error_code === 4) {
                console.log("Пользователь отменил покупку.");
            } else {
                console.error('VK Order Box error', error);
                alert('Произошла ошибка при вызове окна покупки.');
            }
        } finally {
            setPopout(null);
        }
    };

    const getCurrentTariffName = () => {
        return currentUser?.tariff_plan || 'Начальный';
    };

    return (
        <Panel id={id}>
            <PanelHeader>Тарифы</PanelHeader>
            {loading ? <Spinner /> :
            <Group>
                <CardScroll size="s">
                    {tariffsData.map(tariff => {
                        const isCurrent = tariff.name === getCurrentTariffName();
                        return (
                            <Card key={tariff.id} mode="outline" style={{ minWidth: 280, borderColor: isCurrent ? 'var(--vkui--color_background_accent)' : undefined }}>
                                <Header>{tariff.name}</Header>
                                <Div>
                                    <Title level="1" style={{ marginBottom: 4 }}>{tariff.price_str}</Title>
                                    {tariff.price_votes > 0 && <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>/ 30 дней</Text>}
                                </Div>
                                <Group mode="plain">
                                    {tariff.features.map(feature => (
                                        <SimpleCell key={feature.text} before={<Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />} disabled>{feature.text}</SimpleCell>
                                    ))}
                                </Group>
                                <Div>
                                    {isCurrent ? (
                                        <Button size="l" stretched disabled>Ваш тариф</Button>
                                    ) : (
                                        <Button size="l" stretched mode={tariff.price_votes > 0 ? "primary" : "secondary"} onClick={() => handleSelectTariff(tariff)}>
                                            Выбрать
                                        </Button>
                                    )}
                                </Div>
                            </Card>
                        );
                    })}
                </CardScroll>
            </Group>
            }
        </Panel>
    );
};