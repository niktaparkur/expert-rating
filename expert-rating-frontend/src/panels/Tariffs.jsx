import React from 'react';
import {
    Panel,
    PanelHeader,
    Group,
    CardScroll,
    Div,
    Text,
    Button,
    Header,
    Title,
    SimpleCell,
    Card,
    useAdaptivity,
    ViewWidth,
    CardGrid,
    Tooltip,
    Avatar,
    ScreenSpinner,
    Snackbar
} from '@vkontakte/vkui';
import { Icon24CheckCircleOn, Icon16HelpOutline, Icon16Done, Icon16Cancel } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';

const TARIFF_LEVELS = {
    'Начальный': 0,
    'Стандарт': 1,
    'Профи': 2,
};

const tariffsData = [
    {
        id: 'tariff_start', name: 'Начальный', price_str: 'Бесплатно', price_votes: 0,
        features: [
            { text: 'До 3 мероприятий в месяц' },
            { text: 'До 100 голосов на мероприятии', tooltip: 'Максимальное количество уникальных голосов, которое можно получить за одно мероприятие. Пользователи, голосовавшие за вас ранее, не учитываются в этом лимите.' },
            { text: 'До 1 часа длительность голосования' },
        ]
    },
    {
        id: 'tariff_standard', name: 'Стандарт', price_str: '299 голосов', price_votes: 299,
        features: [
            { text: 'До 10 мероприятий в месяц' },
            { text: 'До 200 голосов на мероприятии', tooltip: 'Максимальное количество уникальных голосов, которое можно получить за одно мероприятие. Пользователи, голосовавшие за вас ранее, не учитываются в этом лимите.' },
            { text: 'До 12 часов длительность голосования' },
        ]
    },
    {
        id: 'tariff_pro', name: 'Профи', price_str: '729 голосов', price_votes: 729,
        features: [
            { text: 'До 30 мероприятий в месяц' },
            { text: 'До 1000 голосов на мероприятии', tooltip: 'Максимальное количество уникальных голосов, которое можно получить за одно мероприятие. Пользователи, голосовавшие за вас ранее, не учитываются в этом лимите.' },
            { text: 'До 24 часов длительность голосования' },
        ]
    }
];

const getExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const TariffCardComponent = ({ tariff, isCurrent, isExpert, onSelect, onRegister, isSelectable }) => (
    <Card mode="outline" style={{ borderColor: isCurrent ? 'var(--vkui--color_background_accent)' : undefined }}>
        <Div>
            <Title level="2">{tariff.name}</Title>
        </Div>
        <Div>
            <Title level="1" style={{ marginBottom: 4 }}>{tariff.price_str}</Title>
            {tariff.price_votes > 0 && (
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                    / 30 дней (будет действовать до {getExpiryDate()})
                </Text>
            )}
        </Div>
        <Group mode="plain">
            {tariff.features.map(feature => (
                <SimpleCell
                    key={feature.text}
                    before={<Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />}
                    disabled
                    after={feature.tooltip && (
                        <Tooltip header={feature.tooltip} placement="top">
                            <Icon16HelpOutline style={{ color: 'var(--vkui--color_icon_secondary)' }} />
                        </Tooltip>
                    )}
                >
                    {feature.text}
                </SimpleCell>
            ))}
        </Group>
        <Div>
            {!isExpert ? (
                 <Button size="l" stretched mode="primary" onClick={onRegister}>Стать экспертом</Button>
            ) : isCurrent ? (
                <Button size="l" stretched disabled>Ваш тариф</Button>
            ) : (
                <Button
                    size="l"
                    stretched
                    mode="primary"
                    onClick={() => onSelect(tariff)}
                    disabled={!isSelectable}
                >
                    Выбрать
                </Button>
            )}
        </Div>
    </Card>
);

export const Tariffs = ({ id, user, setPopout, setSnackbar, refetchUser }) => {
    const routeNavigator = useRouteNavigator();
    const { viewWidth } = useAdaptivity();
    const isDesktop = viewWidth >= ViewWidth.TABLET;
    const loading = !user;

    const handleSelectTariff = async (tariff) => {
        if (tariff.price_votes === 0) return;
        setPopout(<ScreenSpinner state="loading" />);
        try {
            await bridge.send('VKWebAppShowOrderBox', { type: 'item', item: tariff.id });
            setSnackbar(
                <Snackbar
                    onClose={() => setSnackbar(null)}
                    before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_accent)' }}><Icon16Done fill="#fff" width={14} height={14} /></Avatar>}
                >
                    После успешной оплаты ваш тариф будет обновлен.
                </Snackbar>
            );
        } catch (error) {
            if (error.error_data?.error_code === 4) {
                 setSnackbar( <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>Покупка была отменена.</Snackbar> );
            } else {
                 setSnackbar( <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>Ошибка окна покупки.</Snackbar> );
            }
        } finally {
            setPopout(null);
        }
    };

    const handleRegister = () => routeNavigator.push('/registration');
    const getCurrentTariffName = () => user?.tariff_plan || 'Начальный';
    const isExpert = user?.is_expert;

    const renderContent = () => {
        if (loading) return <ScreenSpinner />;

        const currentTariffName = getCurrentTariffName();
        const currentUserLevel = TARIFF_LEVELS[currentTariffName] ?? 0;

        const tariffCards = tariffsData.map(tariff => {
            const tariffLevel = TARIFF_LEVELS[tariff.name];
            return (
                <TariffCardComponent
                    key={tariff.id}
                    tariff={tariff}
                    isCurrent={tariff.name === currentTariffName}
                    isExpert={isExpert}
                    onSelect={handleSelectTariff}
                    onRegister={handleRegister}
                    isSelectable={tariffLevel > currentUserLevel}
                />
            );
        });

        if (isDesktop) {
            return <CardScroll size="s">{tariffCards}</CardScroll>;
        }
        return <CardGrid size="l" style={{ padding: 0 }}>{tariffCards}</CardGrid>;
    };

    return (
        <Panel id={id}>
            <PanelHeader>Тарифы</PanelHeader>
            <Group>
                {renderContent()}
            </Group>
        </Panel>
    );
};