// src/panels/CreateEvent.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Panel,
    PanelHeader,
    PanelHeaderBack,
    Group,
    FormItem,
    FormField,
    Input,
    Button,
    ScreenSpinner,
    Div,
    Textarea,
    Checkbox,
    FormStatus,
    ModalRoot,
    ModalCard,
    Calendar,
    Text,
    Spinner
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
    const [durationError, setDurationError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [promoStatus, setPromoStatus] = useState(null);
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const checkPromo = useCallback(debounce(async (word) => {
        const normalizedWord = word.trim().toUpperCase();
        if (!normalizedWord || normalizedWord.length < 4) {
            setPromoStatus(null);
            setIsCheckingPromo(false);
            return;
        }
        setIsCheckingPromo(true);
        try {
            const response = await apiGet(`/events/status/${normalizedWord}`);
            if (response.status === 'not_found') {
                setPromoStatus('available');
            } else {
                setPromoStatus('taken');
            }
        } catch (error) {
            setPromoStatus('error');
        } finally {
            setIsCheckingPromo(false);
        }
    }, 500), [apiGet]);

    useEffect(() => {
        if (formData.promo_word) {
            checkPromo(formData.promo_word);
        }
    }, [formData.promo_word, checkPromo]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'duration_minutes') {
            setDurationError(null);
        }
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
        setDurationError(null);

        if (promoStatus === 'taken' || isCheckingPromo) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Пожалуйста, выберите другое промо-слово.' });
            return;
        }
        if (!formData.event_date_d || !formData.event_date_t) {
            setFormStatus({ mode: 'error', header: 'Ошибка', children: 'Пожалуйста, укажите дату и время мероприятия.' });
            return;
        }

        setIsSubmitting(true);
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
            if (error.message.includes("Duration exceeds limit")) {
                const message = `Длительность превышает лимит для вашего тарифа. Пожалуйста, укажите меньшее значение.`;
                setDurationError(message);
            } else {
                setFormStatus({ mode: 'error', header: 'Ошибка', children: error.message });
            }
        } finally {
            setPopout(null);
            setIsSubmitting(false);
        }
    };

    const getPromoBottomText = () => {
        if (isCheckingPromo) return <Spinner size='s'/>;
        if (promoStatus === 'taken') return <Text style={{ color: 'var(--vkui--color_text_negative)' }}>Это слово уже занято</Text>;
        if (promoStatus === 'available') return <Text style={{ color: 'var(--vkui--color_text_positive)' }}>Слово свободно!</Text>;
        if (promoStatus === 'error') return <Text style={{ color: 'var(--vkui--color_text_negative)' }}>Ошибка проверки</Text>;
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
            <PanelHeader before={<PanelHeaderBack onClick={() => !isSubmitting && routeNavigator.back()} />}>
                Новое мероприятие
            </PanelHeader>
            <Group>
                <form onSubmit={handleSubmit}>
                    {formStatus && <FormItem><FormStatus mode={formStatus.mode} header={formStatus.header}>{formStatus.children}</FormStatus></FormItem>}
                    <FormItem top="Название мероприятия" required><FormField><Input name="name" value={formData.name} onChange={handleChange} /></FormField></FormItem>
                    <FormItem top="Промо-слово" required bottom={getPromoBottomText()} status={promoStatus === 'taken' ? 'error' : 'default'}><FormField><Input name="promo_word" value={formData.promo_word} onChange={handleChange} /></FormField></FormItem>
                    <FormItem top="Ссылка на мероприятие (необязательно)"><FormField><Input name="event_link" type="url" value={formData.event_link} onChange={handleChange} placeholder="https://vk.com/event123" /></FormField></FormItem>
                    <FormItem><Checkbox name="is_private" checked={formData.is_private} onChange={handleChange}>Закрытое мероприятие (не будет в общей афише)</Checkbox></FormItem>
                    <FormItem top="Дата и время начала голосования" required>
                        <Div style={{ display: 'flex', gap: '8px', padding: 0 }}>
                            <FormField style={{ flexGrow: 2 }} after={<Icon24CalendarOutline onClick={() => setActiveModal('calendar-modal')} />}>
                                <Input type="text" name="event_date_d" value={formData.event_date_d} onChange={handleChange} readOnly placeholder="Дата не выбрана" />
                            </FormField>
                            <FormField style={{ flexGrow: 1 }}>
                                <Input type="time" name="event_date_t" value={formData.event_date_t} onChange={handleChange} />
                            </FormField>
                        </Div>
                    </FormItem>
                    <FormItem top="Длительность голосования (в минутах)" required bottom={durationError} status={durationError ? 'error' : 'default'}>
                        <FormField><Input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} /></FormField>
                    </FormItem>
                    <FormItem><Button size="l" stretched type="submit" disabled={isSubmitting}>Отправить на модерацию</Button></FormItem>
                </form>
            </Group>
        </Panel>
    );
};