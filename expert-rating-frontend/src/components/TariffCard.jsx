import React from 'react';
import {Card, Header, Div, Text, Button, SimpleCell, Group, Title} from '@vkontakte/vkui';
import { Icon24CheckCircleOn, Icon24Cancel } from '@vkontakte/icons';

export const TariffCard = ({ tariff, isCurrent = false, onSelect }) => {
    if (!tariff) return null;

    return (
        <Card mode={isCurrent ? "outline" : "shadow"} style={isCurrent ? { borderColor: 'var(--vkui--color_background_accent)' } : {}}>
            <Header mode="primary">{tariff.name}</Header>
            <Div>
                <Title level="1" style={{ marginBottom: '8px' }}>{tariff.price} ₽ / мес.</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>{tariff.description}</Text>
            </Div>

            <Group mode="plain">
                {tariff.features.map((feature, index) => (
                    <SimpleCell
                        key={index}
                        before={feature.available ? <Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" /> : <Icon24Cancel fill="var(--vkui--color_icon_negative)" />}
                        disabled
                    >
                        {feature.text}
                    </SimpleCell>
                ))}
            </Group>

            <Div>
                {isCurrent ? (
                    <Button size="l" stretched disabled>Ваш текущий тариф</Button>
                ) : (
                    <Button size="l" stretched mode="primary" onClick={() => onSelect(tariff.id)}>
                        Выбрать
                    </Button>
                )}
            </Div>
        </Card>
    );
};