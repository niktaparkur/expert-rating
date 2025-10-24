import React from "react";
import { RichCell, Avatar, Text } from "@vkontakte/vkui";
import { UserData } from "../../types";

interface MiniExpertProfileProps {
  expert: Partial<UserData> | null;
}

export const MiniExpertProfile = ({ expert }: MiniExpertProfileProps) => {
  if (!expert) return null;

  return (
    <RichCell
      before={<Avatar size={72} src={expert.photo_url} />}
      subtitle={expert.regalia}
      disabled
    >
      <Text weight="1" useAccentWeight>
        {expert.first_name} {expert.last_name}
      </Text>
    </RichCell>
  );
};
