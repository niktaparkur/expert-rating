// src/components/MiniExpertProfile.jsx

import React from "react";
import { RichCell, Avatar, Text } from "@vkontakte/vkui";

export const MiniExpertProfile = ({ expert }) => {
  if (!expert) return null;

  return (
    <RichCell
      before={<Avatar size={72} src={expert.photo_url} />}
      caption={expert.regalia}
      disabled
    >
      <Text weight="1">
        {expert.first_name} {expert.last_name}
      </Text>
    </RichCell>
  );
};
