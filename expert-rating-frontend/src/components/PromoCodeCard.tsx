import React from "react";
import { SimpleCell, ContentBadge, IconButton } from "@vkontakte/vkui";
import {
  Icon28TicketOutline,
  Icon16CheckCircle,
  Icon16Cancel,
  Icon28MoreVertical,
} from "@vkontakte/icons";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PromoCode {
  id: number;
  code: string;
  discount_percent: number;
  expires_at?: string;
  is_active: boolean;
}

interface PromoCodeCardProps {
  promoCode: PromoCode;
  onMenuClick: (
    event: React.MouseEvent<HTMLElement>,
    promoCode: PromoCode,
  ) => void;
}

export const PromoCodeCard = ({
  promoCode,
  onMenuClick,
}: PromoCodeCardProps) => {
  const subtitle = promoCode.expires_at
    ? `До: ${format(new Date(promoCode.expires_at), "d MMM yyyy, HH:mm", { locale: ru })}`
    : "Бессрочный";

  return (
    <SimpleCell
      before={<Icon28TicketOutline />}
      after={
        <IconButton
          onClick={(e) => onMenuClick(e, promoCode)}
          aria-label="Действия с промокодом"
        >
          <Icon28MoreVertical />
        </IconButton>
      }
      badgeAfterTitle={
        <ContentBadge
          appearance="accent"
          mode="outline"
        >{`${promoCode.discount_percent}%`}</ContentBadge>
      }
      badgeBeforeTitle={
        promoCode.is_active ? (
          <Icon16CheckCircle fill="var(--vkui--color_icon_positive)" />
        ) : (
          <Icon16Cancel fill="var(--vkui--color_icon_negative)" />
        )
      }
      subtitle={subtitle}
    >
      {promoCode.code}
    </SimpleCell>
  );
};
