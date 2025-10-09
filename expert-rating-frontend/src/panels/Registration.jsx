import React, { useState, useEffect, useMemo } from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Button, FormItem, FormField, Input,
    Textarea, Select, ScreenSpinner, Group, Checkbox, FormStatus,
    ModalRoot, ModalPage, ModalPageHeader, Search, Div, ContentBadge, Header, Spinner
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi';

export const Registration = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const { apiPost, apiGet } = useApi();
    const [popout, setPopout] = useState(null);
    const [formStatus, setFormStatus] = useState(null);

    const [userData, setUserData] = useState(null);
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
                const [vkUser, themesData, regionsData] = await Promise.all([
                    bridge.send('VKWebAppGetUserInfo'),
                    apiGet('/meta/themes'),
                    apiGet('/meta/regions')
                ]);

                if (vkUser && vkUser.id) {
                    setUserData(vkUser);
                    // Автозаполнение ссылки, если чекбокс активен
                    setFormData(prev => ({ ...prev, social_link: `https://vk.com/id${vkUser.id}` }));
                }
                setAllThemes(themesData);
                setAllRegions(regionsData);
                // Устанавливаем регион по умолчанию, если список загружен
                if (regionsData.length > 0) {
                    setFormData(prev => ({ ...prev, region: regionsData[0] }));
                }

            } catch (error) {
                console.error('Failed to fetch initial data', error);
                setFormStatus({ mode: 'error', header: 'Ошибка загрузки', children: 'Не удалось загрузить данные для регистрации.' });
            } finally {
                setIsLoadingMeta(false);
            }
        };

        fetchData();
    }, [apiGet]);

    // --- ИЗМЕНЕНИЕ: Логика чекбокса social_link ---
    useEffect(() => {
        if (useVkProfile && userData?.id) {
            setFormData(prev => ({ ...prev, social_link: `https://vk.com/id${userData.id}` }));
        }
    }, [useVkProfile, userData]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isTopicSelectionValid) {
            setFormStatus({ mode: 'error', header: 'Проверка формы', children: 'Пожалуйста, выберите от 1 до 3 тем.' });
            return;
        }
        if (!userData) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Не удалось получить данные профиля VK.' });
            return;
        }

        setPopout(<ScreenSpinner state="loading" />);
        const finalData = {
            user_data: {
                vk_id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                photo_url: userData.photo_200,
            },
            profile_data: { ...formData, theme_ids: selectedThemeIds, referrer: formData.referrer }
        };

        try {
            await apiPost('/experts/register', finalData);
            setFormStatus({ mode: 'success', header: 'Успешно', children: 'Ваша заявка отправлена на модерацию!' });
            setTimeout(() => routeNavigator.back(), 2000);
        } catch (error) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: error.message });
        } finally {
            setPopout(null);
        }
    };

    // --- ИЗМЕНЕНИЕ: Отображение выбранных тем по их ID ---
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

    return (
        <Panel id={id} popout={popout}>
            {topicsModal}
            <PanelHeader before={<PanelHeaderBack onClick={() => popout === null && routeNavigator.back()} />}>
                Стать экспертом
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    {formStatus && <FormItem><FormStatus mode={formStatus.mode} header={formStatus.header}>{formStatus.children}</FormStatus></FormItem>}

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

                    <FormItem top="Ссылка на соц. сеть">
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
                        <Checkbox checked={useVkProfile} onChange={() => setUseVkProfile(!useVkProfile)}>
                            Использовать мой профиль VK
                        </Checkbox>
                    </FormItem>

                    <FormItem top="Регалии">
                        <FormField><Textarea name="regalia" value={formData.regalia} onChange={handleChange} placeholder="Кратко опишите ваши достижения" maxLength={200} required /></FormField>
                    </FormItem>
                    <FormItem top="Ссылка на пример выступления">
                        <FormField><Input type="url" name="performance_link" value={formData.performance_link} onChange={handleChange} placeholder="https://youtube.com/..." required /></FormField>
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
        </Panel>
    );
};