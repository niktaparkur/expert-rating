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
  PanelHeaderBack,
  Select,
} from "@vkontakte/vkui";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../hooks/useApi";

interface PromoCode {
  id?: number;
  code: string;
  tariff_id: number;
  is_active: boolean;
  activations_limit?: number | null;
}

interface PromoCodeEditModalProps {
  id: string;
  promoCode: PromoCode | null;
  onClose: () => void;
  onSave: (promoCode: any) => void;
  onDelete: (promoCodeId: number) => void;
}

export const PromoCodeEditModal = ({
  id,
  promoCode,
  onClose,
  onSave,
  onDelete,
}: PromoCodeEditModalProps) => {
  const { apiGet } = useApi();

  const { data: tariffs } = useQuery({
    queryKey: ["tariffs"],
    queryFn: () => apiGet<any[]>("/tariffs"),
  });

  const [formData, setFormData] = useState({
    code: "",
    tariff_id: "",
    activations_limit: "",
    is_active: true,
  });

  useEffect(() => {
    if (promoCode) {
      setFormData({
        code: promoCode.code,
        tariff_id: String(promoCode.tariff_id),
        activations_limit: promoCode.activations_limit
          ? String(promoCode.activations_limit)
          : "",
        is_active: promoCode.is_active,
      });
    } else {
      setFormData({
        code: "",
        tariff_id: "",
        activations_limit: "",
        is_active: true,
      });
    }
  }, [promoCode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    const isCheckbox = type === "checkbox";
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? checked : value,
    }));
  };

  const handleSaveClick = () => {
    const selectedId = parseInt(formData.tariff_id, 10);

    if (isNaN(selectedId)) {
      console.error(
        "Ошибка: tariff_id не является числом!",
        formData.tariff_id,
      );
    }

    onSave({
      ...formData,
      id: promoCode?.id,
      tariff_id: selectedId,
      activations_limit: formData.activations_limit
        ? parseInt(formData.activations_limit, 10)
        : null,
    });
  };

  const isFormValid = formData.code.trim().length >= 3 && formData.tariff_id;
  const isEditing = !!promoCode?.id;

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          {isEditing ? "Редактировать" : "Создать"} промокод
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <FormItem
          top="Промокод (уникальный)"
          required
          bottom="Минимум 3 символа, будет приведен к верхнему регистру"
        >
          <Input
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Например: FREE_PRO"
          />
        </FormItem>

        <FormItem top="Выдаваемый тариф" required>
          <Select
            name="tariff_id"
            value={formData.tariff_id}
            onChange={handleChange}
            placeholder="Выберите тариф"
            options={(tariffs || []).map((t) => ({
              label: `${t.name} (ID: ${t.id})`,
              value: String(t.id),
            }))}
          />
        </FormItem>

        <FormItem
          top="Общий лимит активаций (необязательно)"
          bottom="Оставьте пустым для безлимитного использования"
        >
          <Input
            type="number"
            name="activations_limit"
            value={formData.activations_limit}
            onChange={handleChange}
            placeholder="Например: 100"
          />
        </FormItem>

        <FormItem style={{ display: "flex" }}>
          <Switch
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          <span style={{ marginLeft: 12 }}>Активен</span>
        </FormItem>
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
            onClick={() => onDelete(promoCode!.id!)}
          >
            Удалить
          </Button>
        )}
      </Div>
    </ModalPage>
  );
};
