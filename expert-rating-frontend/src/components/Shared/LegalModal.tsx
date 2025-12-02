import React from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Div,
  Text,
  Group,
} from "@vkontakte/vkui";

interface LegalModalProps {
  id: string;
  onClose: () => void;
  title: string;
  content: string;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  id,
  onClose,
  title,
  content,
}) => {
  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          {title}
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <Div>
          <Text style={{ whiteSpace: "pre-wrap" }}>{content}</Text>
        </Div>
      </Group>
    </ModalPage>
  );
};
