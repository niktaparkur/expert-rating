import React, { useState } from "react";
import {
  Placeholder,
  Button,
  Checkbox,
  Div,
  SimpleCell,
  Group,
  Header,
  Text,
} from "@vkontakte/vkui";
import { Icon56DocumentOutline, Icon24ChevronRight } from "@vkontakte/icons";

interface LegalConsentProps {
  onAccept: () => void;
  onOpenDoc: (
    docType: "offer" | "user_agreement" | "privacy" | "mailing_consent",
  ) => void;
}

export const LegalConsent: React.FC<LegalConsentProps> = ({
  onAccept,
  onOpenDoc,
}) => {
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        backgroundColor: "var(--vkui--color_background_content)",
      }}
    >
      <Placeholder icon={<Icon56DocumentOutline />} title="Правовая информация">
        Для продолжения работы с приложением, пожалуйста, ознакомьтесь с
        юридическими документами.
      </Placeholder>

      <Group header={<Header>Документы</Header>}>
        <SimpleCell
          onClick={() => onOpenDoc("user_agreement")}
          after={<Icon24ChevronRight />}
        >
          Пользовательское соглашение
        </SimpleCell>
        <SimpleCell
          onClick={() => onOpenDoc("privacy")}
          after={<Icon24ChevronRight />}
        >
          Политика конфиденциальности
        </SimpleCell>
        <SimpleCell
          onClick={() => onOpenDoc("offer")}
          after={<Icon24ChevronRight />}
        >
          Публичная оферта
        </SimpleCell>
        <SimpleCell
          onClick={() => onOpenDoc("mailing_consent")}
          after={<Icon24ChevronRight />}
        >
          Согласие на рассылку
        </SimpleCell>
      </Group>

      <Div>
        <Checkbox
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        >
          <Text size={14}>
            Я прочитал(-а) и принимаю условия вышеуказанных документов, а также
            даю согласие на обработку персональных данных и получение рассылок.
          </Text>
        </Checkbox>
      </Div>

      <Div>
        <Button
          size="l"
          stretched
          mode="primary"
          onClick={onAccept}
          disabled={!checked}
        >
          Продолжить
        </Button>
      </Div>
    </div>
  );
};
