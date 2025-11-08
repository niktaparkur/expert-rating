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
  SimpleCell,
  FormLayoutGroup,
  Spinner,
  Text,
  Title,
} from "@vkontakte/vkui";
import { useApi } from "../../hooks/useApi";
import { useUserStore } from "../../store/userStore";
import { useUiStore } from "../../store/uiStore";

interface PurchaseModalProps {
  id: string;
  onClose: () => void;
  title: string;
  description: string;
  price: number;
  onInitiatePayment: (payload: { email: string; finalPrice: number }) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  id,
  onClose,
  title,
  description,
  price,
  onInitiatePayment,
}) => {
  const { currentUser } = useUserStore();
  const { setSnackbar } = useUiStore();
  const { apiPost } = useApi();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<any | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useEffect(() => {
    if (currentUser?.email) {
      setEmail(currentUser.email);
    }
    setPromoCode("");
    setPromoResult(null);
  }, [id, currentUser]);

  const handleApplyPromo = async () => {
    // В этой версии модалки логика промокода не используется,
    // но ее можно будет добавить по аналогии с Tariffs.tsx
    // Например, передав `tariff_id` для валидации на бэке.
  };

  const handlePayment = () => {
    if (!email || !EMAIL_REGEX.test(email)) {
      setEmailError("Пожалуйста, введите корректный email.");
      return;
    }
    setEmailError(null);

    const finalPrice = promoResult ? promoResult.final_price : price;
    onInitiatePayment({ email, finalPrice });
  };

  const finalPrice = promoResult ? promoResult.final_price : price;

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
          <Text>{description}</Text>
        </Div>
        <Div>
          <Title level="1">{finalPrice} ₽</Title>
        </Div>
      </Group>

      <Group>
        <FormItem
          top="Email для чека"
          required
          status={emailError ? "error" : "default"}
          bottom={emailError}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
          />
        </FormItem>
      </Group>

      <Div>
        <Button size="l" stretched onClick={handlePayment}>
          {`Оплатить ${finalPrice} ₽`}
        </Button>
      </Div>
    </ModalPage>
  );
};
