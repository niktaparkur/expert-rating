import React, { useRef } from "react";
import {
  ModalPage,
  ModalPageHeader,
  Group,
  Div,
  Text,
  Button,
  Title,
  ButtonGroup,
  PanelHeaderButton,
  PanelHeaderBack,
  Caption,
  Snackbar,
} from "@vkontakte/vkui";
import {
  Icon24Download,
  Icon24Dismiss,
  Icon16CopyOutline,
  Icon28CheckCircleFill,
} from "@vkontakte/icons";
import QRCode from "react-qr-code";
import { EventData } from "../../types";
import { useUiStore } from "../../store/uiStore";

interface QrCodeModalProps {
  id: string;
  event: EventData | null;
  onClose: () => void;
  onBack: () => void;
}

const APP_URL = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}`;

export const QrCodeModal = ({
  id,
  event,
  onClose,
  onBack,
}: QrCodeModalProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { setSnackbar } = useUiStore();

  if (!event) return null;

  const qrLink = `${APP_URL}#/vote/${encodeURIComponent(event.promo_word)}`;

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(qrLink)
      .then(() => {
        setSnackbar(
          <Snackbar
            onClose={() => setSnackbar(null)}
            before={
              <Icon28CheckCircleFill fill="var(--vkui--color_icon_positive)" />
            }
          >
            Ссылка скопирована!
          </Snackbar>,
        );
      })
      .catch((err) => {
        console.error("Ошибка копирования:", err);
      });
  };

  const handleDownloadSVG = () => {
    const svgElement = document.getElementById("event-qr-code");
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink/)) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
      );
    }

    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const blob = new Blob([preface, source], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `qr_${event.promo_word}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPNG = () => {
    const svgElement = document.getElementById("event-qr-code");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const size = 1000;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr_${event.promo_word}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onBack} />}>
          QR-код
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <Div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div>
            <Text
              style={{
                color: "var(--vkui--color_text_secondary)",
                marginBottom: 4,
              }}
            >
              Мероприятие:
            </Text>
            <Title level="3" weight="2" style={{ marginBottom: 12 }}>
              {event.name}
            </Title>
          </div>
          <div
            ref={qrRef}
            style={{
              background: "white",
              padding: "16px",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "1px solid var(--vkui--color_separator_primary)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <QRCode
              id="event-qr-code"
              value={qrLink}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>

          <div
            onClick={handleCopyLink}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--vkui--color_background_secondary_alpha)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Icon16CopyOutline
              fill="var(--vkui--color_icon_secondary)"
              width={16}
              height={16}
            />
            <Caption
              level="1"
              style={{
                color: "var(--vkui--color_text_secondary)",
                textDecoration: "underline",
              }}
            >
              {qrLink}
            </Caption>
          </div>

          <div>
            <Text
              style={{
                color: "var(--vkui--color_text_secondary)",
                marginBottom: 4,
              }}
            >
              Промо-слово:
            </Text>
            <Title level="1" weight="1" style={{ letterSpacing: 1 }}>
              {event.promo_word}
            </Title>
          </div>

          <Text
            style={{
              color: "var(--vkui--color_text_secondary)",
              maxWidth: 280,
            }}
          >
            Покажите этот QR-код участникам для быстрого перехода к голосованию.
          </Text>

          <ButtonGroup
            mode="horizontal"
            gap="m"
            stretched
            style={{ marginTop: 8 }}
          >
            <Button
              size="l"
              mode="secondary"
              stretched
              before={<Icon24Download />}
              onClick={handleDownloadPNG}
            >
              PNG
            </Button>
            <Button
              size="l"
              mode="secondary"
              stretched
              before={<Icon24Download />}
              onClick={handleDownloadSVG}
            >
              SVG
            </Button>
          </ButtonGroup>
        </Div>
      </Group>
    </ModalPage>
  );
};
