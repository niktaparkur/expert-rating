import React from 'react';
import {ModalPage, ModalPageHeader, Group, SimpleCell, InfoRow, Header} from '@vkontakte/vkui';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';

interface PromoCode {
    id: number;
    code: string;
    discount_percent: number;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
}

interface PromoCodeDetailsModalProps {
    id: string;
    promoCode: PromoCode | null;
    onClose: () => void;
}

export const PromoCodeDetailsModal = ({id, promoCode, onClose}: PromoCodeDetailsModalProps) => {
    if (!promoCode) {
        return null;
    }

    const formatDate = (dateString?: string) => {
        return dateString ? format(new Date(dateString), 'd MMMM yyyy, HH:mm', {locale: ru}) : 'Бессрочный';
    };

    return (
        <ModalPage id={id} onClose={onClose} header={<ModalPageHeader>Детали промокода</ModalPageHeader>}>
            <Group header={<Header mode="secondary">Основная информация</Header>}>
                <SimpleCell multiline><InfoRow header="Код">{promoCode.code}</InfoRow></SimpleCell>
                <SimpleCell multiline><InfoRow header="Скидка">{promoCode.discount_percent}%</InfoRow></SimpleCell>
                <SimpleCell multiline><InfoRow header="Статус">{promoCode.is_active ? 'Активен' : 'Неактивен'}</InfoRow></SimpleCell>
            </Group>
            <Group header={<Header mode="secondary">Даты</Header>}>
                <SimpleCell multiline><InfoRow
                    header="Дата создания">{formatDate(promoCode.created_at)}</InfoRow></SimpleCell>
                <SimpleCell multiline><InfoRow
                    header="Действителен до">{formatDate(promoCode.expires_at)}</InfoRow></SimpleCell>
            </Group>
        </ModalPage>
    );
};