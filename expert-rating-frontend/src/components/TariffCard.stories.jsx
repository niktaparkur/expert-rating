// src/components/TariffCard.stories.jsx
import React from 'react';
import { fn } from 'storybook/test';
import { TariffCard } from './TariffCard.jsx';
import { CardGrid } from '@vkontakte/vkui';

export default {
    title: 'Components/TariffCard',
    component: TariffCard,
};

const tariffsData = {
    start: {
        id: 'start', name: 'Начальный', price: 0, description: 'Для начинающих экспертов',
        features: [
            { text: 'До 3 мероприятий в месяц', available: true },
            { text: 'До 100 голосов на мероприятии', available: true },
            { text: 'До 1 часа длительность голосования', available: true },
        ]
    },
    standard: {
        id: 'standard', name: 'Стандарт', price: 2000, description: 'Для активного участия',
        features: [
            { text: 'До 10 мероприятий в месяц', available: true },
            { text: 'До 200 голосов на мероприятии', available: true },
            { text: 'До 12 часов длительность голосования', available: true },
            { text: '2 бесплатные рассылки в месяц', available: true },
        ]
    },
    pro: {
        id: 'pro', name: 'Профи', price: 5000, description: 'Для профессионалов',
        features: [
            { text: 'До 30 мероприятий в месяц', available: true },
            { text: 'До 1000 голосов на мероприятии', available: true },
            { text: 'До 24 часов длительность голосования', available: true },
            { text: '4 бесплатные рассылки в месяц', available: true },
        ]
    }
};

const Template = (args) => <TariffCard {...args} />;

export const Start = Template.bind({});
Start.args = {
    tariff: tariffsData.start,
    onSelect: fn(),
};

export const Standard = Template.bind({});
Standard.args = {
    tariff: tariffsData.standard,
    onSelect: fn(),
};

export const Pro = Template.bind({});
Pro.args = {
    tariff: tariffsData.pro,
    onSelect: fn(),
};

export const Current = Template.bind({});
Current.args = {
    tariff: tariffsData.standard,
    isCurrent: true,
    onSelect: fn(),
};

export const AllTariffsGrid = {
    render: () => (
        <CardGrid size="l">
            <TariffCard tariff={tariffsData.start} onSelect={fn()} />
            <TariffCard tariff={tariffsData.standard} isCurrent={true} onSelect={fn()} />
            <TariffCard tariff={tariffsData.pro} onSelect={fn()} />
        </CardGrid>
    )
};