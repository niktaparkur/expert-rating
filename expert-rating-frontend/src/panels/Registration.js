import React, { useState, useEffect } from 'react';
import {
    Panel,
    PanelHeader,
    PanelHeaderBack,
    Button,
    FormItem,
    FormField,
    Input,
    Textarea,
    Select,
    ScreenSpinner,
    Group,
    Checkbox,
    Accordion
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const API_URL = 'https://p.potokrechi.ru/api/v1';

const TOPIC_GROUPS = [
    { name: 'IT-сфера', items: ['Администрирование', 'Анализ и обработка данных', 'Вебмастер', 'Программист'] },
    { name: 'Здоровье', items: ['Диетолог', 'Психолог', 'Тренер/инструктор'] },
    { name: 'Искусство и развлечения', items: ['Артист, актер', 'Ведущий, тамада', 'Музыкант'] }
];
const REGIONS = ["Амурская область", "Архангельская область", "Астраханская область", "Белгородская область", "Брянская область", "Владимирская область", "Волгоградская область", "Вологодская область", "Воронежская область", "Донецкая народная республика", "Ивановская область", "Иркутская область", "Калининградская область", "Калужская область", "Кемеровская область", "Кировская область", "Костромская область", "Курганская область", "Курская область", "Ленинградская область", "Липецкая область", "Луганская народная республика", "Магаданская область", "Московская область", "Мурманская область", "Нижегородская область", "Новгородская область", "Новосибирская область", "Омская область", "Оренбургская область", "Орловская область", "Пензенская область", "Псковская область", "Ростовская область", "Рязанская область", "Самарская область", "Саратовская область", "Сахалинская область", "Свердловская область", "Смоленская область", "Тамбовская область", "Тверская область", "Томская область", "Тульская область", "Тюменская область", "Ульяновская область", "Челябинская область", "Ярославская область"];

export const Registration = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const [popout, setPopout] = useState(null);
    const [userData, setUserData] = useState(null);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [openedAccordion, setOpenedAccordion] = useState(null);
    const [formData, setFormData] = useState({
        region: REGIONS[0],
        social_link: '',
        regalia: '',
        performance_link: '',
        referrer: ''
    });

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
                alert('Не удалось получить данные вашего профиля VK.');
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
            if (selectedTopics.length < 3) {
                setSelectedTopics([...selectedTopics, value]);
            }
        } else {
            setSelectedTopics(selectedTopics.filter(topic => topic !== value));
        }
    };

    const isTopicSelectionValid = selectedTopics.length >= 1;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isTopicSelectionValid) {
            alert('Пожалуйста, выберите хотя бы одну тему экспертизы.');
            return;
        }
        if (!userData) {
            alert('Не удалось получить данные вашего профиля VK. Попробуйте перезайти в приложение.');
            return;
        }
        setPopout(<ScreenSpinner state="loading" />);
        const finalData = {
            user_data: userData,
            profile_data: {
                ...formData,
                topics: selectedTopics,
                referrer: formData.referrer
            }
        };
        try {
            const response = await fetch(`${API_URL}/experts/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Произошла ошибка при отправке заявки');
            }
            alert('Ваша заявка успешно отправлена на модерацию!');
            routeNavigator.push('/');
        } catch (error) {
            console.error('Registration failed', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            setPopout(null);
        }
    };

    return (
        <Panel id={id} popout={popout}>
            <PanelHeader before={<PanelHeaderBack onClick={() => popout === null && routeNavigator.back()} />}>
                Стать экспертом
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    <FormItem top="Темы экспертизы" bottom={`Выбрано ${selectedTopics.length} из 3`}>
                        {TOPIC_GROUPS.map((group, index) => (
                            <Accordion key={group.name}>
                                <Accordion.Summary>{group.name}</Accordion.Summary>
                                <Accordion.Content>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 15px' }}>
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
                                </Accordion.Content>
                            </Accordion>
                        ))}
                    </FormItem>

                    <FormItem top="Домашний регион">
                        <FormField>
                            <Select name="region" value={formData.region} onChange={handleChange} options={REGIONS.map(region => ({ label: region, value: region }))} required />
                        </FormField>
                    </FormItem>

                    <FormItem top="Ссылка на соц. сеть">
                        <FormField>
                            <Input type="url" name="social_link" value={formData.social_link} onChange={handleChange} placeholder="https://vk.com/durov" required />
                        </FormField>
                    </FormItem>

                    <FormItem top="Регалии">
                        <FormField>
                            <Textarea name="regalia" value={formData.regalia} onChange={handleChange} placeholder="Кратко опишите ваши достижения" maxLength={200} required />
                        </FormField>
                    </FormItem>

                    <FormItem top="Ссылка на пример выступления">
                        <FormField>
                            <Input type="url" name="performance_link" value={formData.performance_link} onChange={handleChange} placeholder="https://youtube.com/..." required />
                        </FormField>
                    </FormItem>

                    <FormItem top="Кто вас пригласил? (необязательно)">
                         <FormField>
                             <Input type="text" name="referrer" value={formData.referrer} onChange={handleChange} placeholder="Логин или ID пригласившего" />
                         </FormField>
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