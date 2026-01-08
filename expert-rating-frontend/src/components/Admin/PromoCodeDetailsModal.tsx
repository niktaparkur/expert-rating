import React from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  SimpleCell,
  InfoRow,
  Header,
  PanelHeaderBack,
} from "@vkontakte/vkui";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PromoCode {
  id: number;
  code: string;
  discount_percent: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  activations_limit?: number | null;
  user_activations_limit?: number;
}

interface PromoCodeDetailsModalProps {
  id: string;
  promoCode: PromoCode | null;
  onClose: () => void;
}

export const PromoCodeDetailsModal = ({
  id,
  promoCode,
  onClose,
}: PromoCodeDetailsModalProps) => {
  if (!promoCode) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    return dateString
      ? format(new Date(dateString), "d MMMM yyyy, HH:mm", { locale: ru })
      : "Бессрочный";
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Детали промокода
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group header={<Header>Основная информация</Header>}>
        <SimpleCell multiline>
          <InfoRow header="Код">{promoCode.code}</InfoRow>
        </SimpleCell>
        <SimpleCell multiline>
          <InfoRow header="Скидка">{promoCode.discount_percent}%</InfoRow>
        </SimpleCell>
        <SimpleCell multiline>
          <InfoRow header="Статус">
            {promoCode.is_active ? "Активен" : "Неактивен"}
          </InfoRow>
        </SimpleCell>
      </Group>

      <Group header={<Header>Лимиты активаций</Header>}>
        <SimpleCell multiline>
          <InfoRow header="Общий лимит">
            {promoCode.activations_limit === null ||
            promoCode.activations_limit === undefined
              ? "Безлимитный"
              : promoCode.activations_limit}
          </InfoRow>
        </SimpleCell>
        <SimpleCell multiline>
          <InfoRow header="Лимит на пользователя">
            {promoCode.user_activations_limit}
          </InfoRow>
        </SimpleCell>
      </Group>

      <Group header={<Header>Даты</Header>}>
        <SimpleCell multiline>
          <InfoRow header="Дата создания">
            {formatDate(promoCode.created_at)}
          </InfoRow>
        </SimpleCell>
        <SimpleCell multiline>
          <InfoRow header="Действителен до">
            {formatDate(promoCode.expires_at)}
          </InfoRow>
        </SimpleCell>
      </Group>
    </ModalPage>
  );
};
