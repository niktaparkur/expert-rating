import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Input,
  Button,
  Div,
  Switch,
  FormStatus,
} from "@vkontakte/vkui";

interface AdminTariffEditModalProps {
  id: string;
  onClose: () => void;
  tariff: any;
  onSave: (id: number, data: any) => Promise<void>;
}

export const AdminTariffEditModal = ({
  id,
  onClose,
  tariff,
  onSave,
}: AdminTariffEditModalProps) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tariff) {
      setFormData({
        name: tariff.name,
        price: tariff.price_votes,
        event_limit: tariff.event_limit,
        event_duration_hours: tariff.event_duration_hours,
        max_votes_per_event: tariff.max_votes_per_event,
        vk_donut_link: tariff.vk_donut_link || "",
        is_active: tariff.is_active,
      });
    }
  }, [tariff]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      ...formData,
      price: Number(formData.price),
      event_limit: Number(formData.event_limit),
      event_duration_hours: Number(formData.event_duration_hours),
      max_votes_per_event: Number(formData.max_votes_per_event),
    };
    await onSave(tariff.id, payload);
    setLoading(false);
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Редактирование тарифа
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Div>
        <FormStatus mode="error">
          ВНИМАНИЕ: Цена здесь должна строго соответствовать цене в VK Donut!
          Автоматической синхронизации нет.
        </FormStatus>
      </Div>
      <Group>
        <FormItem top="Название">
          <Input
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Цена (руб)">
          <Input
            type="number"
            name="price"
            value={formData.price || 0}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Ссылка на VK Donut">
          <Input
            name="vk_donut_link"
            value={formData.vk_donut_link || ""}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Лимит мероприятий">
          <Input
            type="number"
            name="event_limit"
            value={formData.event_limit || 0}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Длительность (часов)">
          <Input
            type="number"
            name="event_duration_hours"
            value={formData.event_duration_hours || 0}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem top="Лимит голосов">
          <Input
            type="number"
            name="max_votes_per_event"
            value={formData.max_votes_per_event || 0}
            onChange={handleChange}
          />
        </FormItem>
        <FormItem style={{ display: "flex", gap: "8px" }}>
          <Switch
            name="is_active"
            checked={formData.is_active || false}
            onChange={handleChange}
          />{" "}
          <span style={{ marginLeft: 8 }}>Активен</span>
        </FormItem>
      </Group>
      <Div style={{ paddingBottom: "50px" }}>
        <Button size="l" stretched onClick={handleSave} loading={loading}>
          Сохранить
        </Button>
      </Div>
    </ModalPage>
  );
};
