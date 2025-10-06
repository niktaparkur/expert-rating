import { useState, useEffect } from 'react';
import {
    Panel, PanelHeader, Group, CardScroll, Div, Text, ScreenSpinner, Button, Header,
    Title, SimpleCell, Card, Spinner, useAdaptivity, ViewWidth, CardGrid, Snackbar, Avatar
} from '@vkontakte/vkui';
import {Icon16Cancel, Icon16Done, Icon24CheckCircleOn} from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';
import { useApi } from '../hooks/useApi';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const tariffsData = [
    { id: 'tariff_start', name: 'Начальный', price_str: 'Бесплатно', price_votes: 0, features: [ { text: 'До 3 мероприятий в месяц' }, { text: 'До 100 голосов' } ] },
    { id: 'tariff_standard', name: 'Эксперт', price_str: '299 голосов', price_votes: 299, features: [ { text: 'До 10 мероприятий в месяц' }, { text: 'До 200 голосов' }, { text: '2 рассылки в месяц' } ] },
    { id: 'tariff_pro', name: 'Профи', price_str: '729 голосов', price_votes: 729, features: [ { text: 'До 30 мероприятий в месяц' }, { text: 'До 1000 голосов' }, { text: '4 рассылки в месяц' } ] }
];

const TariffCardComponent = ({ tariff, isCurrent, isExpert, onSelect, onRegister }) => (
    <Card mode="outline" style={{ borderColor: isCurrent ? 'var(--vkui--color_background_accent)' : undefined }}>
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
            {!isExpert ? (
                 <Button size="l" stretched mode="primary" onClick={onRegister}>Стать экспертом</Button>
            ) : isCurrent ? (
                <Button size="l" stretched disabled>Ваш тариф</Button>
            ) : (
                <Button size="l" stretched mode={tariff.price_votes > 0 ? "primary" : "secondary"} onClick={() => onSelect(tariff)}>
                    Выбрать
                </Button>
            )}
        </Div>
    </Card>
);

export const Tariffs = ({ id, user, setPopout, setSnackbar }) => {
    const routeNavigator = useRouteNavigator();
    const { viewWidth } = useAdaptivity();
    const isDesktop = viewWidth >= ViewWidth.TABLET;
    const [loading, setLoading] = useState(!user);

    useEffect(() => {
        if (user) setLoading(false);
    }, [user]);

    const handleSelectTariff = async (tariff) => {
        if (tariff.price_votes === 0) return;

        setPopout(<ScreenSpinner state="loading" />);
        try {
            const result = await bridge.send('VKWebAppShowOrderBox', {
                type: 'item',
                item: tariff.id
            });

            // Вместо alert() показываем Snackbar
            if (result.success) {
                setSnackbar(
                    <Snackbar
                        onClose={() => setSnackbar(null)}
                        before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_positive)' }}><Icon16Done fill="#fff" width={14} height={14} /></Avatar>}
                    >
                        Окно покупки открыто. Ваш тариф будет обновлен после оплаты.
                    </Snackbar>
                );
            }
        } catch (error) {
            // Обрабатываем отмену покупки
            if (error.error_data && error.error_data.error_code === 4) {
                 setSnackbar(
                    <Snackbar
                        onClose={() => setSnackbar(null)}
                        before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_negative)' }}><Icon16Cancel fill="#fff" width={14} height={14} /></Avatar>}
                    >
                        Покупка была отменена.
                    </Snackbar>
                );
            } else {
                console.error('VK Order Box error', error);
                 setSnackbar(
                    <Snackbar
                        onClose={() => setSnackbar(null)}
                        before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_negative)' }}><Icon16Cancel fill="#fff" width={14} height={14} /></Avatar>}
                    >
                       Произошла ошибка при вызове окна покупки.
                    </Snackbar>
                );
            }
        } finally {
            setPopout(null);
        }
    };

    const handleRegister = () => routeNavigator.push('/registration');
    const getCurrentTariffName = () => user?.tariff_plan || 'Начальный';
    const isExpert = user?.is_expert;

    const renderContent = () => {
        if (loading) return <Spinner />;

        const tariffCards = tariffsData.map(tariff => (
            <TariffCardComponent
                key={tariff.id}
                tariff={tariff}
                isCurrent={tariff.name === getCurrentTariffName()}
                isExpert={isExpert}
                onSelect={handleSelectTariff}
                onRegister={handleRegister}
            />
        ));

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