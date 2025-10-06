// src/panels/Registration.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Button, FormItem, FormField, Input,
    Textarea, Select, ScreenSpinner, Group, Checkbox, FormStatus,
    ModalRoot, ModalPage, ModalPageHeader, Search, Div, ContentBadge, Header
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi'; // Используем useApi

const TOPIC_GROUPS = [
    { name: 'IT-сфера', items: ['Администрирование', 'Анализ и обработка данных', 'Вебмастер', 'Программист'] },
    { name: 'Здоровье', items: ['Диетолог', 'Психолог', 'Тренер/инструктор'] },
    { name: 'Искусство и развлечения', items: ['Артист, актер', 'Ведущий, тамада', 'Музыкант'] }
];
const REGIONS = ["Амурская область", "Архангельская область", "Астраханская область", "Белгородская область", "Брянская область", "Владимирская область", "Волгоградская область", "Вологодская область", "Воронежская область", "Донецкая народная республика", "Ивановская область", "Иркутская область", "Калининградская область", "Калужская область", "Кемеровская область", "Кировская область", "Костромская область", "Курганская область", "Курская область", "Ленинградская область", "Липецкая область", "Луганская народная республика", "Магаданская область", "Московская область", "Мурманская область", "Нижегородская область", "Новгородская область", "Новосибирская область", "Омская область", "Оренбургская область", "Орловская область", "Пензенская область", "Псковская область", "Ростовская область", "Рязанская область", "Самарская область", "Саратовская область", "Сахалинская область", "Свердловская область", "Смоленская область", "Тамбовская область", "Тверская область", "Томская область", "Тульская область", "Тюменская область", "Ульяновская область", "Челябинская область", "Ярославская область"];

export const Registration = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const { apiPost } = useApi(); // Получаем метод apiPost из хука
    const [popout, setPopout] = useState(null);
    const [formStatus, setFormStatus] = useState(null);
    const [userData, setUserData] = useState(null);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [formData, setFormData] = useState({
        region: REGIONS[0],
        social_link: '',
        regalia: '',
        performance_link: '',
        referrer: ''
    });

    const [activeModal, setActiveModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTopics = useMemo(() => {
        if (!searchQuery) return TOPIC_GROUPS;
        const lowerQuery = searchQuery.toLowerCase();
        return TOPIC_GROUPS.map(group => ({
            ...group,
            items: group.items.filter(item => item.toLowerCase().includes(lowerQuery))
        })).filter(group => group.items.length > 0);
    }, [searchQuery]);

    useEffect(() => {
        setPopout(<ScreenSpinner state="loading" />);
        bridge.send('VKWebAppGetUserInfo')
            .then(user => {
                if (user && user.id) {
                    setUserData({ vk_id: user.id, first_name: user.first_name, last_name: user.last_name, photo_url: user.photo_200 });
                }
            })
            .catch(error => {
                console.error('Failed to get user data', error);
                setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Не удалось получить данные вашего профиля VK.'});
            })
            .finally(() => setPopout(null));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTopicChange = (e) => {
        const { value, checked } = e.target;
        if (checked) {
            if (selectedTopics.length < 3) setSelectedTopics([...selectedTopics, value]);
        } else {
            setSelectedTopics(selectedTopics.filter(topic => topic !== value));
        }
    };

    const isTopicSelectionValid = selectedTopics.length >= 1;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormStatus(null);
        if (!isTopicSelectionValid) {
            setFormStatus({ mode: 'error', header: 'Проверка формы', children: 'Пожалуйста, выберите хотя бы одну тему экспертизы.' });
            return;
        }
        if (!userData) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Не удалось получить данные профиля VK. Перезайдите в приложение.' });
            return;
        }
        setPopout(<ScreenSpinner state="loading" />);
        const finalData = {
            user_data: userData,
            profile_data: { ...formData, topics: selectedTopics, referrer: formData.referrer }
        };
        try {
            await apiPost('/experts/register', finalData);
            setFormStatus({ mode: 'success', header: 'Успешно', children: 'Ваша заявка отправлена на модерацию!' });
            setTimeout(() => routeNavigator.back(), 1500); // Возвращаемся назад после успеха
        } catch (error) {
            console.error('Registration failed', error);
            setFormStatus({ mode: 'error', header: 'Ошибка', children: error.message });
        } finally {
            setPopout(null);
        }
    };

    const topicsModal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage
                id="topics-modal"
                onClose={() => setActiveModal(null)}
                header={<ModalPageHeader>Выберите темы ({selectedTopics.length}/3)</ModalPageHeader>}
            >
                <Search value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <Group>
                    {filteredTopics.map(group => (
                        <div key={group.name}>
                            <Header>{group.name}</Header>
                            {group.items.map(item => (
                                <Checkbox
                                    key={item}
                                    value={`${group.name} > ${item}`}
                                    checked={selectedTopics.includes(`${group.name} > ${item}`)}
                                    onChange={handleTopicChange}
                                    disabled={selectedTopics.length >= 3 && !selectedTopics.includes(`${group.name} > ${item}`)}
                                >
                                    {item}
                                </Checkbox>
                            ))}
                        </div>
                    ))}
                    {filteredTopics.length === 0 && <Div>Ничего не найдено</Div>}
                </Group>
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id} popout={popout}>
            {topicsModal}
            <PanelHeader before={<PanelHeaderBack onClick={() => popout === null && routeNavigator.back()} />}>
                Стать экспертом
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    {formStatus && <FormItem><FormStatus mode={formStatus.mode} header={formStatus.header}>{formStatus.children}</FormStatus></FormItem>}

                    <FormItem top="Темы экспертизы" bottom="Выберите от 1 до 3 тем">
                        <Button mode="secondary" size="l" stretched onClick={() => setActiveModal('topics-modal')}>
                           Выбрать темы
                        </Button>
                        {selectedTopics.length > 0 && (
                            <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
                                {selectedTopics.map(topic => (
                                    <ContentBadge key={topic} mode="primary" >{topic.split(' > ')[1]}</ContentBadge>
                                ))}
                            </Div>
                        )}
                    </FormItem>

                    <FormItem top="Домашний регион">
                        <FormField><Select name="region" value={formData.region} onChange={handleChange} options={REGIONS.map(region => ({ label: region, value: region }))} required searchable/></FormField>
                    </FormItem>
                    <FormItem top="Ссылка на соц. сеть">
                        <FormField><Input type="url" name="social_link" value={formData.social_link} onChange={handleChange} placeholder="https://vk.com/durov" required /></FormField>
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