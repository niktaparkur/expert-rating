import React from "react";
import { ModalCard, Button, Placeholder } from "@vkontakte/vkui";
import { Icon56LaptopOutline } from "@vkontakte/icons";

interface MobilePaymentStubModalProps {
  id: string;
  onClose: () => void;
}

export const MobilePaymentStubModal: React.FC<MobilePaymentStubModalProps> = ({
  id,
  onClose,
}) => {
  return (
    <ModalCard id={id} onClose={onClose} title="Доступно в веб-версии">
      <Placeholder icon={<Icon56LaptopOutline />} title="Используйте компьютер">
        Подробный отчет с аналитикой доступен в веб-версии приложения.
        Пожалуйста, зайдите с компьютера.
      </Placeholder>
      <Button size="l" stretched mode="primary" onClick={onClose}>
        Понятно
      </Button>
    </ModalCard>
  );
};
