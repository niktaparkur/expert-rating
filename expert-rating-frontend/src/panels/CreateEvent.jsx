// src/panels/CreateEvent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel, PanelHeader, PanelHeaderBack, Group, FormItem, FormField, Input, Button, ScreenSpinner, Div,
    Textarea, Checkbox, FormStatus, ModalRoot, ModalCard, Calendar, Text, Spinner
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useApi } from '../hooks/useApi.js';
import { Icon24CalendarOutline } from '@vkontakte/icons';
import debounce from 'lodash.debounce';

export const CreateEvent = ({ id, setPopout }) => {
    const routeNavigator = useRouteNavigator();
    const { apiPost, apiGet } = useApi();
    const [formData, setFormData] = useState({
        name: '',
        promo_word: '',
        event_link: '',
        is_private: false,
        event_date_d: '',
        event_date_t: '',
        duration_minutes: 60,
    });
    const [formStatus, setFormStatus] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [promoStatus, setPromoStatus] = useState({ status: 'default', text: '' }); // 'default', 'checking', 'taken', 'available'

    // eslint-disable-next-line
    const checkPromo = useCallback(debounce(async (word) => {
        if (!word || word.length < 4) {
            setPromoStatus({ status: 'default', text: '' });
            return;
        }
        setPromoStatus({ status: 'checking', text: 'Проверка...' });
        try {
            const { is_taken } = await apiGet(`/events/check-promo/${word}`);
            if (is_taken) {
                setPromoStatus({ status: 'taken', text: 'Это слово уже занято' });
            } else {
                setPromoStatus({ status: 'available', text: 'Слово свободно!' });
            }
        } catch (error) {
            setPromoStatus({ status: 'default', text: 'Ошибка проверки' });
        }
    }, 500), [apiGet]);

    useEffect(() => {
        checkPromo(formData.promo_word);
    }, [formData.promo_word, checkPromo]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDateChange = (newDate) => {
        if (newDate) {
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            setFormData(prev => ({ ...prev, event_date_d: `${year}-${month}-${day}` }));
        }
        setActiveModal(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormStatus(null);
        if (promoStatus.status === 'taken' || promoStatus.status === 'checking') {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Пожалуйста, выберите другое промо-слово.' });
            return;
        }
        if (!formData.event_date_d || !formData.event_date_t) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Пожалуйста, укажите дату и время мероприятия.' });
            return;
        }
        setPopout(<ScreenSpinner state="loading" />);
        const combinedDateTime = new Date(`${formData.event_date_d}T${formData.event_date_t}`);
        const finalData = {
            name: formData.name,
            promo_word: formData.promo_word,
            event_link: formData.event_link || null,
            is_private: formData.is_private,
            duration_minutes: parseInt(formData.duration_minutes),
            event_date: combinedDateTime.toISOString(),
        };
        try {
            await apiPost('/events/create', finalData);
            setFormStatus({ mode: 'success', header: 'Успешно', children: 'Мероприятие отправлено на модерацию!' });
            setFormData({ name: '', promo_word: '', event_link: '', is_private: false, event_date_d: '', event_date_t: '', duration_minutes: 60 });
            setTimeout(() => routeNavigator.push('/dashboard'), 1500);
        } catch (error) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: error.message });
        } finally {
            setPopout(null);
        }
    };

    const getPromoBottomText = () => {
        if (promoStatus.status === 'checking') return <Spinner size='s'/>;
        if (promoStatus.text) {
            const color = promoStatus.status === 'taken' ? 'var(--vkui--color_text_negative)' : 'var(--vkui--color_text_positive)';
            return <Text style={{ color }}>{promoStatus.text}</Text>;
        }
        return "Уникальное слово для голосования. Только латинские буквы и цифры.";
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalCard id="calendar-modal" onClose={() => setActiveModal(null)} header="Выберите дату">
                <Calendar value={formData.event_date_d ? new Date(formData.event_date_d) : new Date()} onChange={handleDateChange} disablePast />
            </ModalCard>
        </ModalRoot>
    );

    return (
        <Panel id={id}>
            {modal}
            <PanelHeader before={<PanelHeaderBack onClick={() => setPopout(null) || routeNavigator.back()} />}>
                Новое мероприятие
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    {formStatus && <FormItem><FormStatus mode={formStatus.mode} header={formStatus.header}>{formStatus.children}</FormStatus></FormItem>}

                    <FormItem top="Название мероприятия" required><FormField><Input name="name" value={formData.name} onChange={handleChange} /></FormField></FormItem>
                    <FormItem top="Промо-слово" required bottom={getPromoBottomText()}><FormField><Input name="promo_word" value={formData.promo_word} onChange={handleChange} /></FormField></FormItem>

                    <FormItem top="Ссылка на мероприятие (необязательно)">
                        <FormField><Input name="event_link" type="url" value={formData.event_link} onChange={handleChange} placeholder="https://vk.com/event123" /></FormField>
                    </FormItem>
                    <FormItem>
                        <Checkbox name="is_private" checked={formData.is_private} onChange={handleChange}>Закрытое мероприятие (не будет в общей афише)</Checkbox>
                    </FormItem>

                    <FormItem top="Дата и время начала голосования" required>
                        <Div style={{ display: 'flex', gap: '8px', padding: 0 }}>
                            <FormField style={{ flexGrow: 2 }}>
                                <Input type="date" name="event_date_d" value={formData.event_date_d} onChange={handleChange} after={<Icon24CalendarOutline onClick={() => setActiveModal('calendar-modal')} />} />
                            </FormField>
                            <FormField style={{ flexGrow: 1 }}>
                                <Input type="time" name="event_date_t" value={formData.event_date_t} onChange={handleChange} />
                            </FormField>
                        </Div>
                    </FormItem>

                    <FormItem top="Длительность голосования (в минутах)" required><FormField><Input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} /></FormField></FormItem>

                    <FormItem><Button size="l" stretched type="submit">Отправить на модерацию</Button></FormItem>
                </form>
            </Group>
        </Panel>
    );
};