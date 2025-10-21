import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  FormItem,
  Input,
  Switch,
  Div,
  Button,
  DateInput,
  SimpleCell,
  FixedLayout,
} from "@vkontakte/vkui";

interface PromoCode {
  id?: number;
  code: string;
  discount_percent: number;
  expires_at?: string | null;
  is_active: boolean;
  activations_limit?: number | null;
  user_activations_limit?: number;
}

interface PromoCodeEditModalProps {
  id: string;
  promoCode: PromoCode | null;
  onClose: () => void;
  onSave: (promoCode: PromoCode) => void;
  onDelete: (promoCodeId: number) => void;
}

export const PromoCodeEditModal = ({
  id,
  promoCode,
  onClose,
  onSave,
  onDelete,
}: PromoCodeEditModalProps) => {
  const [formData, setFormData] = useState<PromoCode>({
    code: "",
    discount_percent: 10,
    expires_at: null,
    is_active: true,
    activations_limit: null,
    user_activations_limit: 1,
  });

  useEffect(() => {
    if (promoCode) {
      setFormData({
        ...promoCode,
        expires_at: promoCode.expires_at ? promoCode.expires_at : null,
        user_activations_limit: promoCode.user_activations_limit ?? 1,
      });
    } else {
      setFormData({
        code: "",
        discount_percent: 10,
        expires_at: null,
        is_active: true,
        activations_limit: null,
        user_activations_limit: 1,
      });
    }
  }, [promoCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "activations_limit") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : parseInt(value, 10),
      }));
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? 0 : parseInt(value, 10),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date: Date | null | undefined) => {
    setFormData((prev) => ({
      ...prev,
      expires_at: date ? date.toISOString() : null,
    }));
  };

  const handleSaveClick = () => {
    onSave(formData);
  };

  const isFormValid =
    formData.code.trim().length >= 3 &&
    (formData.discount_percent ?? 0) > 0 &&
    (formData.discount_percent ?? 0) <= 100;
  const isEditing = !!promoCode?.id;

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader>
          {isEditing ? "Редактировать" : "Создать"} промокод
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <FormItem
          top="Промокод (уникальный)"
          required
          status={formData.code.trim().length < 3 ? "error" : "default"}
          bottom="Минимум 3 символа, будет приведен к верхнему регистру"
        >
          <Input name="code" value={formData.code} onChange={handleChange} />
        </FormItem>
        <FormItem
          top="Процент скидки"
          required
          status={
            (formData.discount_percent ?? 0) <= 0 ||
            (formData.discount_percent ?? 0) > 100
              ? "error"
              : "default"
          }
        >
          <Input
            type="number"
            name="discount_percent"
            value={String(formData.discount_percent)}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Действителен до (необязательно)">
          <DateInput
            value={formData.expires_at ? new Date(formData.expires_at) : null}
            onChange={handleDateChange}
            enableTime
            accessible
          />
        </FormItem>

        <FormItem
          top="Общий лимит активаций (необязательно)"
          bottom="Оставьте пустым для безлимитного использования"
        >
          <Input
            type="number"
            name="activations_limit"
            value={formData.activations_limit ?? ""}
            onChange={handleChange}
            placeholder="Например: 100"
          />
        </FormItem>
        <FormItem
          top="Лимит на одного пользователя"
          bottom="Сколько раз один пользователь может применить код"
        >
          <Input
            type="number"
            name="user_activations_limit"
            value={formData.user_activations_limit ?? ""}
            onChange={handleChange}
          />
        </FormItem>

        <SimpleCell
          Component="label"
          after={
            <Switch
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          }
        >
          Активен
        </SimpleCell>
      </Group>

      <Div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <Button
          size="l"
          stretched
          onClick={handleSaveClick}
          disabled={!isFormValid}
        >
          Сохранить
        </Button>
        {isEditing && (
          <Button
            size="l"
            stretched
            appearance="negative"
            onClick={() => onDelete(promoCode.id!)}
          >
            Удалить
          </Button>
        )}
      </Div>
    </ModalPage>
  );
};
