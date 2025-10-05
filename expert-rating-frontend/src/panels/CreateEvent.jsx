// src/panels/CreateEvent.jsx
import React, { useState } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, FormItem, FormField, Input, Button, ScreenSpinner, Div, Textarea, Checkbox } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const CreateEvent = ({ id, setPopout }) => {
    const routeNavigator = useRouteNavigator();
    const [formData, setFormData] = useState({
        name: '',
        promo_word: '',
        event_link: '',
        is_private: false,
        event_date_d: '',
        event_date_t: '',
        duration_minutes: 60,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.event_date_d || !formData.event_date_t) {
            alert('Пожалуйста, укажите дату и время мероприятия.');
            return;
        }
        setPopout(<ScreenSpinner state="loading" />);
        const combinedDateTime = new Date(`${formData.event_date_d}T${formData.event_date_t}`);
        const finalData = {
            name: formData.name,
            promo_word: formData.promo_word,
            event_link: formData.event_link,
            is_private: formData.is_private,
            duration_minutes: parseInt(formData.duration_minutes),
            event_date: combinedDateTime.toISOString(),
        };
        try {
            const response = await fetch(`${API_URL}/events/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        <Panel id={id}>
            <PanelHeader before={<PanelHeaderBack onClick={() => setPopout(null) || routeNavigator.back()} />}>
                Новое мероприятие
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    <FormItem top="Название мероприятия"><FormField><Input name="name" value={formData.name} onChange={handleChange} required /></FormField></FormItem>
                    <FormItem top="Промо-слово"><FormField><Input name="promo_word" value={formData.promo_word} onChange={handleChange} required /></FormField></FormItem>
                    <FormItem top="Ссылка на мероприятие (необязательно)">
                        <FormField><Input name="event_link" value={formData.event_link} onChange={handleChange} placeholder="https://vk.com/event123" /></FormField>
                        <Checkbox name="is_private" checked={formData.is_private} onChange={handleChange}>Закрытое мероприятие</Checkbox>
                    </FormItem>
                    <FormItem top="Дата и время начала голосования">
                        <Div style={{ display: 'flex', gap: '8px', padding: 0 }}>
                            <FormField style={{ flexGrow: 2 }}><Input type="date" name="event_date_d" value={formData.event_date_d} onChange={handleChange} required /></FormField>
                            <FormField style={{ flexGrow: 1 }}><Input type="time" name="event_date_t" value={formData.event_date_t} onChange={handleChange} required /></FormField>
                        </Div>
                    </FormItem>
                    <FormItem top="Длительность голосования (в минутах)"><FormField><Input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required /></FormField></FormItem>
                    <FormItem><Button size="l" stretched type="submit">Отправить на модерацию</Button></FormItem>
                </form>
            </Group>
        </Panel>
    );
};