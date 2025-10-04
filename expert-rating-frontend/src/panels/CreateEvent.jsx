// src/panels/CreateEvent.jsx
import React, { useState } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, FormItem, FormField, Input, Button, ScreenSpinner, Div } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const CreateEvent = ({ id }) => {
    const routeNavigator = useRouteNavigator();
    const [popout, setPopout] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        promo_word: '',
        duration_minutes: 60,
        event_date_d: '', // для <input type="date">
        event_date_t: '', // для <input type="time">
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.event_date_d || !formData.event_date_t) {
            alert('Пожалуйста, укажите дату и время мероприятия.');
            return;
        }

        setPopout(<ScreenSpinner state="loading" />);

        // Объединяем дату и время в один ISO-8601 UTC-совместимый формат
        const combinedDateTime = new Date(`${formData.event_date_d}T${formData.event_date_t}`);

        const finalData = {
            name: formData.name,
            promo_word: formData.promo_word,
            duration_minutes: parseInt(formData.duration_minutes),
            event_date: combinedDateTime.toISOString(), // Отправляем в формате ISO
        };

        try {
            const response = await fetch(`${API_URL}/events/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // TODO: Добавить заголовок Authorization
                body: JSON.stringify(finalData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Не удалось создать мероприятие');
            }

            alert('Мероприятие отправлено на модерацию!');
            routeNavigator.push('/dashboard');
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setPopout(null);
        }
    };

    return (
        <Panel id={id} popout={popout}>
            <PanelHeader before={<PanelHeaderBack onClick={() => !popout && routeNavigator.back()} />}>
                Новое мероприятие
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    <FormItem top="Название мероприятия">
                        <FormField><Input name="name" value={formData.name} onChange={handleChange} required /></FormField>
                    </FormItem>

                    <FormItem top="Промо-слово" bottom="Уникальное слово для голосования. Только латинские буквы и цифры.">
                        <FormField><Input name="promo_word" value={formData.promo_word} onChange={handleChange} required /></FormField>
                    </FormItem>

                    <FormItem top="Дата и время мероприятия">
                        <Div style={{ display: 'flex', gap: '8px', padding: 0 }}>
                            <FormField style={{ flexGrow: 2 }}>
                                <Input type="date" name="event_date_d" value={formData.event_date_d} onChange={handleChange} required />
                            </FormField>
                            <FormField style={{ flexGrow: 1 }}>
                                <Input type="time" name="event_date_t" value={formData.event_date_t} onChange={handleChange} required />
                            </FormField>
                        </Div>
                    </FormItem>

                    <FormItem top="Длительность голосования (в минутах)">
                        <FormField><Input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required /></FormField>
                    </FormItem>

                    <FormItem>
                        <Button size="l" stretched type="submit" disabled={popout}>
                            Отправить на модерацию
                        </Button>
                    </FormItem>
                </form>
            </Group>
        </Panel>
    );
};