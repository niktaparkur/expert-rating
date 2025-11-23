import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Textarea,
  Button,
  Div,
  Spinner,
} from "@vkontakte/vkui";

interface EditRegaliaModalProps {
  id: string;
  onClose: () => void;
  currentRegalia: string;
  onSave: (newRegalia: string) => Promise<void>;
}

export const EditRegaliaModal: React.FC<EditRegaliaModalProps> = ({
  id,
  onClose,
  currentRegalia,
  onSave,
}) => {
  const [regalia, setRegalia] = useState(currentRegalia);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRegalia(currentRegalia);
  }, [currentRegalia]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(regalia);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Редактирование
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <FormItem top="О себе (регалии)">
          <Textarea
            value={regalia}
            onChange={(e) => setRegalia(e.target.value)}
            maxLength={500}
            placeholder="Расскажите о себе..."
          />
        </FormItem>
        <Div>
          <Button
            size="l"
            stretched
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            Сохранить
          </Button>
        </Div>
      </Group>
    </ModalPage>
  );
};
