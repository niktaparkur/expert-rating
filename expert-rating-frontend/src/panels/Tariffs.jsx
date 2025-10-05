// src/panels/Tariffs.jsx
import React, { useState } from 'react';
import { Panel, PanelHeader, Group, Spinner, CardScroll, Card, Header, Title, Text, Button, SimpleCell, Div } from '@vkontakte/vkui';
import { Icon24CheckCircleOn } from '@vkontakte/icons';

const tariffsData = [
    { id: 'start', name: 'Начальный', price: 'Бесплатно', features: [ { text: 'До 3 мероприятий в месяц' }, { text: 'До 100 голосов' } ] },
    { id: 'standard', name: 'Эксперт', price: '299 голосов', features: [ { text: 'До 10 мероприятий в месяц' }, { text: 'До 200 голосов' }, { text: '2 рассылки в месяц' } ] },
    { id: 'pro', name: 'Профи', price: '729 голосов', features: [ { text: 'До 30 мероприятий в месяц' }, { text: 'До 1000 голосов' }, { text: '4 рассылки в месяц' } ] }
];

export const Tariffs = ({ id }) => {
    const [currentTariffId, setCurrentTariffId] = useState('start');

    const handleSelectTariff = (tariffId) => {
        alert(`Выбран тариф: ${tariffId}`);
    };

    return (
        <Panel id={id}>
            <PanelHeader>Тарифы</PanelHeader>
            <Group>
                <CardScroll size="s">
                    {tariffsData.map(tariff => (
                        <Card key={tariff.id} mode="outline" style={{ minWidth: 280, borderColor: tariff.id === currentTariffId ? 'var(--vkui--color_background_accent)' : undefined }}>
                            <Header>{tariff.name}</Header>
                            <Div>
                                <Title level="1" style={{ marginBottom: 4 }}>{tariff.price}</Title>
                                {tariff.price !== 'Бесплатно' && <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>/ 30 дней</Text>}
                            </Div>
                            <Group mode="plain">
                                {tariff.features.map(feature => (
                                    <SimpleCell key={feature.text} before={<Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />} disabled>{feature.text}</SimpleCell>
                                ))}
                            </Group>
                            <Div>
                                {tariff.id === currentTariffId ? (
                                    <Button size="l" stretched disabled>Ваш тариф</Button>
                                ) : (
                                    <Button size="l" stretched mode="primary" onClick={() => handleSelectTariff(tariff.id)}>Выбрать</Button>
                                )}
                            </Div>
                        </Card>
                    ))}
                </CardScroll>
            </Group>
        </Panel>
    );
};