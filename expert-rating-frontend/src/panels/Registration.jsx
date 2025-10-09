// src/panels/Registration.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Button, FormItem, FormField, Input,
    Textarea, Select, ScreenSpinner, Group, Checkbox,
    ModalRoot, ModalPage, ModalPageHeader, Search, Div, ContentBadge, Header, Spinner, ModalCard, Snackbar
} from '@vkontakte/vkui';
import { Icon16Cancel, Icon56CheckCircleOutline } from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi';
import { PendingRequestCard } from '../components/PendingRequestCard.jsx';

export const Registration = ({ id, user, refetchUser }) => {
    const routeNavigator = useRouteNavigator();
    const { apiPost, apiGet } = useApi();
    const [popout, setPopout] = useState(null);
    const [snackbar, setSnackbar] = useState(null);

    const [allThemes, setAllThemes] = useState([]);
    const [allRegions, setAllRegions] = useState([]);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    const [selectedThemeIds, setSelectedThemeIds] = useState([]);
    const [formData, setFormData] = useState({
        region: '',
        social_link: '',
        regalia: '',
        performance_link: '',
        referrer: ''
    });

    const [activeModal, setActiveModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [useVkProfile, setUseVkProfile] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingMeta(true);
            try {
                const [themesData, regionsData] = await Promise.all([
                    apiGet('/meta/themes'),
                    apiGet('/meta/regions')
                ]);

                if (useVkProfile && user?.vk_id) {
                    setFormData(prev => ({ ...prev, social_link: `https://vk.com/id${user.vk_id}` }));
                }
                setAllThemes(themesData);
                setAllRegions(regionsData);
                if (regionsData.length > 0 && !formData.region) {
                    setFormData(prev => ({ ...prev, region: regionsData[0] }));
                }

            } catch (error) {
                console.error('Failed to fetch initial data', error);
                setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>Не удалось загрузить данные для регистрации.</Snackbar>);
            } finally {
                setIsLoadingMeta(false);
            }
        };

        fetchData();
    }, [apiGet, useVkProfile, user]);

    const filteredTopics = useMemo(() => {
        if (!searchQuery) return allThemes;
        const lowerQuery = searchQuery.toLowerCase();
        return allThemes.map(group => ({
            ...group,
            items: group.items.filter(item => item.name.toLowerCase().includes(lowerQuery))
        })).filter(group => group.items.length > 0);
    }, [searchQuery, allThemes]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTopicChange = (e, themeId) => {
        const { checked } = e.target;
        if (checked) {
            if (selectedThemeIds.length < 3) setSelectedThemeIds([...selectedThemeIds, themeId]);
        } else {
            setSelectedThemeIds(selectedThemeIds.filter(id => id !== themeId));
        }
    };

    const isTopicSelectionValid = selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

    const handleWithdraw = async () => {
        setPopout(<ScreenSpinner />);
        try {
            await apiPost('/experts/withdraw');
            await refetchUser();
        } catch (error) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>);
        } finally {
            setPopout(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isTopicSelectionValid) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>Пожалуйста, выберите от 1 до 3 тем.</Snackbar>);
            return;
        }
        if (!user) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel/>}>Не удалось получить данные профиля VK.</Snackbar>);
            return;
        }

        setPopout(<ScreenSpinner state="loading" />);
        const finalData = {
            user_data: {
                vk_id: user.vk_id,
                first_name: user.first_name,
                last_name: user.last_name,
                photo_url: user.photo_url,
            },
            profile_data: { ...formData, theme_ids: selectedThemeIds, referrer: formData.referrer }
        };

        try {
            await apiPost('/experts/register', finalData);
            await refetchUser();
            setPopout(
                <ModalCard
                    id="success-modal"
                    onClose={() => setPopout(null)}
                    icon={<Icon56CheckCircleOutline style={{ color: 'var(--vkui--color_icon_positive)' }}/>}
                    header="Заявка отправлена на модерацию"
                    subheader="Если вы ошиблись в данных, вы можете отозвать заявку в разделе 'Аккаунт' и подать ее заново."
                    actions={<Button size="l" mode="primary" stretched onClick={() => { setPopout(null); routeNavigator.back(); }}>Понятно</Button>}
                />
            );
        } catch (error) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>);
            setPopout(null);
        }
    };

    const getSelectedThemeNames = () => {
        const names = [];
        for (const category of allThemes) {
            for (const theme of category.items) {
                if (selectedThemeIds.includes(theme.id)) {
                    names.push(theme.name);
                }
            }
        }
        return names;
    };

    const topicsModal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage
                id="topics-modal"
                onClose={() => setActiveModal(null)}
                header={<ModalPageHeader>Выберите темы ({selectedThemeIds.length}/3)</ModalPageHeader>}
            >
                <Search value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <Group>
                    {filteredTopics.map(group => (
                        <div key={group.name}>
                            <Header>{group.name}</Header>
                            {group.items.map(item => (
                                <Checkbox
                                    key={item.id}
                                    checked={selectedThemeIds.includes(item.id)}
                                    onChange={(e) => handleTopicChange(e, item.id)}
                                    disabled={selectedThemeIds.length >= 3 && !selectedThemeIds.includes(item.id)}
                                >
                                    {item.name}
                                </Checkbox>
                            ))}
                        </div>
                    ))}
                    {filteredTopics.length === 0 && <Div>Ничего не найдено</Div>}
                </Group>
            </ModalPage>
        </ModalRoot>
    );

    if (isLoadingMeta) {
        return <Panel id={id}><ScreenSpinner /></Panel>;
    }

    if (user?.status === 'pending') {
        return (
            <Panel id={id}>
                <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
                    Статус заявки
                </PanelHeader>
                <PendingRequestCard onWithdraw={handleWithdraw} isLoading={popout !== null} />
            </Panel>
        );
    }

    return (
        <Panel id={id} popout={popout}>
            {topicsModal}
            <PanelHeader before={<PanelHeaderBack onClick={() => popout === null && routeNavigator.back()} />}>
                Стать экспертом
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    <FormItem top="Темы экспертизы" bottom={`Выбрано: ${selectedThemeIds.length} из 3`}>
                        <Button mode="secondary" size="l" stretched onClick={() => setActiveModal('topics-modal')}>
                           Выбрать темы
                        </Button>
                        {selectedThemeIds.length > 0 && (
                            <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
                                {getSelectedThemeNames().map(name => (
                                    <ContentBadge key={name} mode="primary">{name}</ContentBadge>
                                ))}
                            </Div>
                        )}
                    </FormItem>
                    <FormItem top="Домашний регион">
                        <FormField>
                            <Select
                                name="region"
                                value={formData.region}
                                onChange={handleChange}
                                options={allRegions.map(region => ({ label: region, value: region }))}
                                required
                                searchable
                            />
                        </FormField>
                    </FormItem>
                    <FormItem top="Ссылка на аккаунт или ваше сообщество">
                        <FormField>
                            <Input
                                type="url"
                                name="social_link"
                                value={formData.social_link}
                                onChange={handleChange}
                                placeholder="https://vk.com/durov"
                                required
                                disabled={useVkProfile}
                            />
                        </FormField>
                        <Checkbox checked={useVkProfile} onChange={(e) => setUseVkProfile(e.target.checked)}>
                            Использовать мой профиль VK
                        </Checkbox>
                    </FormItem>
                    <FormItem top="Регалии">
                        <FormField><Textarea name="regalia" value={formData.regalia} onChange={handleChange} placeholder="Кратко опишите ваши достижения" maxLength={200} required /></FormField>
                    </FormItem>
                    <FormItem top="Ссылка на пример выступления (показывается только для организаторов мероприятий)">
                        <FormField><Input type="url" name="performance_link" value={formData.performance_link} onChange={handleChange} placeholder="https://vk.com/..." required /></FormField>
                    </FormItem>
                    <FormItem top="Кто вас пригласил? (необязательно)">
                         <FormField><Input type="text" name="referrer" value={formData.referrer} onChange={handleChange} placeholder="Логин или ID пригласившего" /></FormField>
                    </FormItem>
                    <FormItem>
                        <Button size="l" stretched type="submit" disabled={popout !== null || !isTopicSelectionValid}>
                            Отправить на модерацию
                        </Button>
                    </FormItem>
                </form>
            </Group>
            {snackbar}
        </Panel>
    );
};