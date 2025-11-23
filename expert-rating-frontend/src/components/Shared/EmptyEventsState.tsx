import React from "react";
import { Placeholder, Button } from "@vkontakte/vkui";
import { Icon56AddCircleOutline } from "@vkontakte/icons";

interface EmptyEventsStateProps {
  onCreate: () => void;
}

export const EmptyEventsState: React.FC<EmptyEventsStateProps> = ({
  onCreate,
}) => {
  return (
    <Placeholder
      icon={
        <Icon56AddCircleOutline
          style={{ color: "var(--vkui--color_icon_secondary)" }}
        />
      }
      title="Мероприятий пока нет"
      action={
        <Button size="m" mode="secondary" onClick={onCreate}>
          Создать мероприятие
        </Button>
      }
    >
      Здесь пока пусто. Создайте свое первое мероприятие, чтобы начать собирать
      рейтинг!
    </Placeholder>
  );
};
