import React from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  Div,
  Header,
  Text,
} from "@vkontakte/vkui";
import QRCode from "react-qr-code";
import { EventData } from "../../types";

interface QrCodeModalProps {
  id: string;
  event: EventData | null;
  onClose: () => void;
}

const APP_URL = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}`;

export const QrCodeModal = ({ id, event, onClose }: QrCodeModalProps) => {
  if (!event) return null;

  const qrLink = `${APP_URL}#/vote/${event.promo_word}`;

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={<ModalPageHeader>QR-код для голосования</ModalPageHeader>}
      settlingHeight={100}
    >
      <Group>
        <Div style={{ textAlign: "center" }}>
          <Header>{event.name}</Header>
          <Text>
            Промо-слово: <strong>{event.promo_word}</strong>
          </Text>
          <div
            style={{
              background: "white",
              padding: "16px",
              margin: "16px auto",
              display: "inline-block",
            }}
          >
            <QRCode value={qrLink} size={192} />
          </div>
          <Text>Покажите этот QR-код участникам для голосования.</Text>
        </Div>
      </Group>
    </ModalPage>
  );
};
