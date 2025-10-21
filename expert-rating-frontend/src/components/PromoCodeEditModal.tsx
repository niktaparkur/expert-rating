import React, {useState, useEffect} from 'react';
import {
    ModalPage,
    ModalPageHeader,
    Group,
    FormItem,
    Input,
    SimpleCell,
    Switch,
    Div,
    Button,
    FormField,
    DateInput
} from '@vkontakte/vkui';


interface PromoCode {
    id?: number;
    code: string;
    discount_percent: number;
    expires_at?: string | null;
    is_active: boolean;
}

interface PromoCodeEditModalProps {
    id: string;
    promoCode: PromoCode | null;
    onClose: () => void;
    onSave: (promoCode: PromoCode) => void;
    onDelete: (promoCodeId: number) => void;
}

export const PromoCodeEditModal = ({id, promoCode, onClose, onSave, onDelete}: PromoCodeEditModalProps) => {
    const [formData, setFormData] = useState<PromoCode>({
        code: '', discount_percent: 10, expires_at: null, is_active: true
    });

    useEffect(() => {
        if (promoCode) {
            setFormData({
                ...promoCode,
                expires_at: promoCode.expires_at ? promoCode.expires_at : null,
            });
        } else {
            setFormData({code: '', discount_percent: 10, expires_at: null, is_active: true});
        }
    }, [promoCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, type, checked} = e.target;
        setFormData(prev => ({...prev, [name]: type === 'checkbox' ? checked : value}));
    };

    const handleDateChange = (date: Date | null | undefined) => {
        setFormData(prev => ({...prev, expires_at: date ? date.toISOString() : null}));
    };

    const isFormValid = formData.code.trim().length >= 3 && formData.discount_percent > 0 && formData.discount_percent <= 100;
    const isEditing = !!promoCode?.id;

    return (
        <ModalPage id={id} onClose={onClose}
                   header={<ModalPageHeader>{isEditing ? 'Редактировать' : 'Создать'} промокод</ModalPageHeader>}>
            <Group>
                <FormItem top="Промокод (уникальный)" required
                          status={formData.code.trim().length < 3 ? 'error' : 'default'}
                          bottom="Минимум 3 символа, будет приведен к верхнему регистру">
                    <Input name="code" value={formData.code} onChange={handleChange}/>
                </FormItem>
                <FormItem top="Процент скидки" required
                          status={formData.discount_percent <= 0 || formData.discount_percent > 100 ? 'error' : 'default'}>
                    <Input type="number" name="discount_percent" value={String(formData.discount_percent)}
                           onChange={handleChange}/>
                </FormItem>
                <FormItem top="Действителен до (необязательно)">
                    <DateInput value={formData.expires_at ? new Date(formData.expires_at) : null}
                               onChange={handleDateChange} enableTime accessible/>
                </FormItem>
                <SimpleCell Component="label"
                            after={<Switch name="is_active" checked={formData.is_active} onChange={handleChange}/>}>
                    Активен
                </SimpleCell>
                <Div style={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
                    <Button size="l" stretched onClick={() => onSave(formData)} disabled={!isFormValid}>
                        Сохранить
                    </Button>
                    {isEditing && (
                        <Button size="l" stretched appearance="negative" onClick={() => onDelete(promoCode.id!)}>
                            Удалить
                        </Button>
                    )}
                </Div>
            </Group>
        </ModalPage>
    );
};