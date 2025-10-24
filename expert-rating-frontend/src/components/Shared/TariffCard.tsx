import React from "react";
import {
  Card,
  Header,
  Div,
  Text,
  Button,
  SimpleCell,
  Group,
  Title,
} from "@vkontakte/vkui";
import { Icon24CheckCircleOn, Icon24Cancel } from "@vkontakte/icons";

interface TariffFeature {
  text: string;
  available: boolean;
}

interface Tariff {
  id: string;
  name: string;
  price: number;
  description: string;
  features: TariffFeature[];
}

interface TariffCardProps {
  tariff: Tariff | null;
  isCurrent?: boolean;
  onSelect: (tariffId: string) => void;
}

export const TariffCard = ({
  tariff,
  isCurrent = false,
  onSelect,
}: TariffCardProps) => {
  if (!tariff) return null;

  return (
    <Card
      mode={isCurrent ? "outline" : "shadow"}
      style={
        isCurrent
          ? { borderColor: "var(--vkontakte--color_background_accent)" }
          : {}
      }
    >
      <Header>{tariff.name}</Header>
      <Div>
        <Title level="1" style={{ marginBottom: "8px" }}>
          {tariff.price} ₽ / мес.
        </Title>
        <Text style={{ color: "var(--vkontakte--color_text_secondary)" }}>
          {tariff.description}
        </Text>
      </Div>

      <Group mode="plain">
        {tariff.features.map((feature, index) => (
          <SimpleCell
            key={index}
            before={
              feature.available ? (
                <Icon24CheckCircleOn fill="var(--vkontakte--color_icon_positive)" />
              ) : (
                <Icon24Cancel fill="var(--vkontakte--color_icon_negative)" />
              )
            }
            disabled
          >
            {feature.text}
          </SimpleCell>
        ))}
      </Group>

      <Div>
        {isCurrent ? (
          <Button size="l" stretched disabled>
            Ваш текущий тариф
          </Button>
        ) : (
          <Button
            size="l"
            stretched
            mode="primary"
            onClick={() => onSelect(tariff.id)}
          >
            Выбрать
          </Button>
        )}
      </Div>
    </Card>
  );
};
