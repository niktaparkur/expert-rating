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
  SimpleCell,
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
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    vk_donut_link: "",
    event_limit: "",
    event_duration_hours: "",
    max_votes_per_event: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tariff) {
      setFormData({
        name: tariff.name || "",
        price: String(tariff.price_votes ?? 0),
        event_limit: String(tariff.event_limit ?? 0),
        event_duration_hours: String(tariff.event_duration_hours ?? 0),
        max_votes_per_event: String(tariff.max_votes_per_event ?? 0),
        vk_donut_link: tariff.vk_donut_link || "",
        is_active: tariff.is_active ?? true,
      });
    }
  }, [tariff]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      name: formData.name,
      price: Number(formData.price),
      event_limit: Number(formData.event_limit),
      event_duration_hours: Number(formData.event_duration_hours),
      max_votes_per_event: Number(formData.max_votes_per_event),
      vk_donut_link: formData.vk_donut_link,
      is_active: formData.is_active,
    };
    await onSave(tariff.id, payload);
    setLoading(false);
    onClose();
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
    >
      <Div>
        <FormStatus mode="error">
          ВНИМАНИЕ: Цена здесь должна строго соответствовать цене в VK Donut!
          Автоматической синхронизации нет.
        </FormStatus>
      </Div>
      <Group>
        <FormItem top="Название тарифа">
          <Input name="name" value={formData.name} onChange={handleChange} />
        </FormItem>

        <FormItem top="Цена (руб)">
          <Input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
          />
        </FormItem>

        <FormItem top="Ссылка на VK Donut (для оплаты)">
          <Input
            name="vk_donut_link"
            value={formData.vk_donut_link}
            onChange={handleChange}
            placeholder="https://vk.com/donut/..."
          />
        </FormItem>

        <FormItem top="Лимит мероприятий в месяц">
          <Input
            type="number"
            name="event_limit"
            value={formData.event_limit}
            onChange={handleChange}
          />
        </FormItem>

        <FormItem top="Длительность голосования (часов)">
          <Input
            type="number"
            name="event_duration_hours"
            value={formData.event_duration_hours}
            onChange={handleChange}
          />
        </FormItem>

        <FormItem top="Лимит голосов на одно мероприятие">
          <Input
            type="number"
            name="max_votes_per_event"
            value={formData.max_votes_per_event}
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
          Активен (виден пользователям)
        </SimpleCell>
      </Group>
      <Div>
        <Button size="l" stretched onClick={handleSave} loading={loading}>
          Сохранить
        </Button>
      </Div>
    </ModalPage>
  );
};
