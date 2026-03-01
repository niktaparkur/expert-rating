import React, { useState } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  FormItem,
  Textarea,
  Button,
  Div,
  Select,
  FormStatus,
  Spinner,
} from "@vkontakte/vkui";
import { useApi } from "../../hooks/useApi";
import { useUiStore } from "../../store/uiStore";
import { Icon28CheckCircleFill } from "@vkontakte/icons";

interface AdminBroadcastModalProps {
  id: string;
  onClose: () => void;
}

export const AdminBroadcastModal = ({
  id,
  onClose,
}: AdminBroadcastModalProps) => {
  const { apiPost } = useApi();
  const { setSnackbar } = useUiStore();

  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await apiPost<{ message: string }>(
        "/mailings/admin/broadcast",
        {
          message,
          target_group: target,
        },
      );
      setSnackbar(<FormStatus mode="default">{res.message}</FormStatus>);
      onClose();
      setMessage("");
    } catch (e: any) {
      setSnackbar(<FormStatus mode="error">{e.message}</FormStatus>);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Рассылка
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Div>
        <FormStatus mode="default">
          Сообщение получат только пользователи, разрешившие уведомления от
          сообщества.
        </FormStatus>
      </Div>
      <FormItem top="Кому отправить">
        <Select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={[
            { label: "Всем пользователям", value: "all" },
            { label: "Только экспертам", value: "experts" },
            { label: "Обычным пользователям", value: "users" },
          ]}
        />
      </FormItem>
      <FormItem top="Текст сообщения">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите текст рассылки..."
        />
      </FormItem>
      <Div>
        <Button
          size="l"
          stretched
          onClick={handleSend}
          loading={loading}
          disabled={!message.trim()}
        >
          Отправить
        </Button>
      </Div>
    </ModalPage>
  );
};
