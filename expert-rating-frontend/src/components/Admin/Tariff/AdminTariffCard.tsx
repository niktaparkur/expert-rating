import React from "react";
import {
  Card,
  Div,
  Title,
  Text,
  Button,
  SimpleCell,
  Switch,
} from "@vkontakte/vkui";
import { Icon28EditOutline } from "@vkontakte/icons";

interface AdminTariffCardProps {
  tariff: any;
  onEdit: (tariff: any) => void;
}

export const AdminTariffCard = ({ tariff, onEdit }: AdminTariffCardProps) => {
  return (
    <Card mode="outline" style={{ marginBottom: 12 }}>
      <Div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level="2">{tariff.name}</Title>
          <Text style={{ color: "var(--vkui--color_text_secondary)" }}>
            {tariff.price_str}
          </Text>
        </div>
        <Button mode="tertiary" onClick={() => onEdit(tariff)}>
          <Icon28EditOutline />
        </Button>
      </Div>
      <SimpleCell disabled subtitle="Лимит мероприятий">
        {tariff.features.find((f: any) => f.tooltip === "Мероприятий в месяц")
          ?.text || "-"}
      </SimpleCell>
      <SimpleCell disabled subtitle="Длительность слова">
        {tariff.features.find(
          (f: any) => f.tooltip === "Длительность голосования",
        )?.text || "-"}
      </SimpleCell>
    </Card>
  );
};
