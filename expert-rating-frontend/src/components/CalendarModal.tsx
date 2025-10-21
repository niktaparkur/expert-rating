import React from 'react';
import { ModalPage, ModalPageHeader, Calendar } from '@vkontakte/vkui';

interface CalendarModalProps {
    id: string;
    onClose: () => void;
    onDateChange: (date: Date) => void;
    initialDate?: Date;
}

export const CalendarModal = ({ id, onClose, onDateChange, initialDate }: CalendarModalProps) => {

    const handleDateSelect = (date: Date) => {
        onDateChange(date);
        onClose();
    };

    return (
        <ModalPage id={id} onClose={onClose} header={<ModalPageHeader>Выберите дату и время</ModalPageHeader>}>
            <Calendar
                value={initialDate || new Date()}
                onChange={handleDateSelect}
                enableTime
                disablePast
                showNeighboringMonth
            />
        </ModalPage>
    );
};