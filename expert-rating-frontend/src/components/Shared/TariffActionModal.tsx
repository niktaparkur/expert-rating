import React, { useState } from "react";
import {
  ModalCard,
  FormItem,
  Input,
  Button,
  Div,
  Text,
  Snackbar,
} from "@vkontakte/vkui";
import {
  Icon24CheckCircleOn,
  Icon56ErrorTriangleOutline,
  Icon28TicketOutline,
} from "@vkontakte/icons";
import { useApi } from "../../hooks/useApi";
import { useUiStore } from "../../store/uiStore";
import { useQueryClient } from "@tanstack/react-query";

interface TariffActionModalProps {
  id: string;
  onClose: () => void;
  tariff: {
    id: string;
    name: string;
    vk_donut_link: string | null;
  } | null;
}

export const TariffActionModal = ({
  id,
  onClose,
  tariff,
}: TariffActionModalProps) => {
  const { apiPost } = useApi();
  const { setSnackbar } = useUiStore();
  const queryClient = useQueryClient();

  const [promoCode, setPromoCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    if (!promoCode.trim()) {
      if (tariff?.vk_donut_link) {
        window.open(tariff.vk_donut_link, "_blank");
        onClose();
      } else {
        setError("Для этого тарифа нет ссылки на оплату.");
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiPost<any>("/promo/activate", {
        code: promoCode.trim(),
      });

      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={
            <Icon24CheckCircleOn fill="var(--vkui--color_icon_positive)" />
          }
        >
          {response.message}
        </Snackbar>,
      );

      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      onClose();
      setPromoCode("");
    } catch (e: any) {
      setError(e.message || "Неверный промокод");
    } finally {
      setIsLoading(false);
    }
  };

  if (!tariff) return null;

  return (
    <ModalCard
      id={id}
      onClose={onClose}
      icon={
        <Icon28TicketOutline
          width={56}
          height={56}
          style={{ color: "var(--vkui--color_icon_accent)" }}
        />
      }
      title={`Тариф «${tariff.name}»`}
      description="Оформите подписку VK Donut или введите промокод для бесплатного доступа."
    >
      <FormItem
        top="Промокод (если есть)"
        status={error ? "error" : "default"}
        bottom={error}
      >
        <Input
          placeholder="Введите код"
          value={promoCode}
          onChange={(e) => {
            setPromoCode(e.target.value);
            setError(null);
          }}
          maxLength={30}
          style={{ textTransform: "uppercase" }}
          disabled={isLoading}
        />
      </FormItem>

      <Div>
        <Button
          size="l"
          stretched
          mode="primary"
          onClick={handleAction}
          loading={isLoading}
        >
          {promoCode.trim().length > 0
            ? "Активировать промокод"
            : "Оформить подписку"}
        </Button>
      </Div>
    </ModalCard>
  );
};
