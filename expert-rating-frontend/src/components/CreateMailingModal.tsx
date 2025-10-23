import React, { useState } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  FormItem,
  Textarea,
  Button,
  Div,
  FormStatus,
} from "@vkontakte/vkui";

interface CreateMailingModalProps {
  id: string;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
  mailingLimits: { used: number; limit: number };
}

export const CreateMailingModal: React.FC<CreateMailingModalProps> = ({
  id,
  onClose,
  onSend,
  mailingLimits,
}) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendClick = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(message);
      // Успешное закрытие и показ snackbar'а обрабатываются в родительском компоненте
    } catch (error) {
      // Ошибки также обрабатываются в родительском компоненте
    } finally {
      setIsSending(false);
    }
  };

  const isLimitReached = mailingLimits.used >= mailingLimits.limit;
  const isFormInvalid = message.trim().length < 10 || isLimitReached;

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Новая рассылка
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Div>
        <FormStatus header="Как это работает" mode="default">
          Сообщение будет отправлено всем пользователям, которые проголосовали
          за вас «Доверяю». Рассылка сперва отправляется на модерацию.
        </FormStatus>
      </Div>
      <FormItem
        top="Текст сообщения"
        bottom={`Использовано рассылок в этом месяце: ${mailingLimits.used} из ${mailingLimits.limit}`}
        status={isLimitReached ? "error" : "default"}
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Например: Друзья, приглашаю вас на мой новый вебинар..."
          maxLength={1024}
          disabled={isLimitReached}
        />
      </FormItem>
      <Div>
        <Button
          size="l"
          stretched
          onClick={handleSendClick}
          disabled={isFormInvalid || isSending}
          loading={isSending}
        >
          Отправить на модерацию
        </Button>
      </Div>
    </ModalPage>
  );
};
