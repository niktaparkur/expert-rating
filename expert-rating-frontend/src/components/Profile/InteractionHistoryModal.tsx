import React from "react";
import {
    ModalPage,
    ModalPageHeader,
    Group,
    SimpleCell,
    Avatar,
    Text,
    Spinner,
    Placeholder,
    Div,
    Header,
} from "@vkontakte/vkui";
import {
    Icon20CheckCircleFillGreen,
    Icon20CancelCircleFillRed,
    Icon20InfoCircleOutline,
    Icon28CalendarOutline,
} from "@vkontakte/icons";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../hooks/useApi";
import { VoteData } from "../../types";

interface InteractionHistoryModalProps {
    id: string;
    onClose: () => void;
    expertId: number | null;
    ratingType: "expert" | "community" | null;
}

export const InteractionHistoryModal = ({
    id,
    onClose,
    expertId,
    ratingType,
}: InteractionHistoryModalProps) => {
    const { apiGet } = useApi();

    const { data: history, isLoading } = useQuery({
        queryKey: ["voteHistory", expertId, ratingType],
        queryFn: () =>
            apiGet<VoteData[]>(`/users/me/votes/${expertId}/history?rating_type=${ratingType}`),
        enabled: !!expertId && !!ratingType,
    });

    const ratingTypeLabel =
        ratingType === "expert" ? "Экспертный рейтинг" : "Народный рейтинг";

    return (
        <ModalPage
            id={id}
            onClose={onClose}
            header={<ModalPageHeader>История фидбеков</ModalPageHeader>}
            settlingHeight={100}
        >
            <Group header={<Header>{ratingTypeLabel}</Header>}>
                {isLoading ? (
                    <Spinner size="l" style={{ margin: "20px 0" }} />
                ) : history && history.length > 0 ? (
                    history.map((record) => {
                        const date = new Date(record.created_at).toLocaleString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        const VoteIcon =
                            record.rating_snapshot === 1
                                ? Icon20CheckCircleFillGreen
                                : record.rating_snapshot === -1
                                    ? Icon20CancelCircleFillRed
                                    : Icon20InfoCircleOutline;

                        const voteText =
                            record.rating_snapshot === 1
                                ? "Доверяю"
                                : record.rating_snapshot === -1
                                    ? "Не доверяю"
                                    : "Нейтрально";

                        return (
                            <SimpleCell
                                key={record.id}
                                before={
                                    record.event ? (
                                        <Icon28CalendarOutline width={24} height={24} />
                                    ) : (
                                        <Avatar size={24} src={record.expert?.photo_url} />
                                    )
                                }
                                subtitle={
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <VoteIcon width={14} height={14} />
                                            <Text style={{ fontSize: "13px", fontWeight: 500 }}>{voteText}</Text>
                                        </div>
                                        {record.event && (
                                            <Text style={{ fontSize: "12px", color: "var(--vkui--color_text_secondary)" }}>
                                                Событие: {record.event.name}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: "12px", color: "var(--vkui--color_text_subhead)" }}>
                                            {date}
                                        </Text>
                                    </div>
                                }
                                multiline
                            >
                                {record.event?.expert_info
                                    ? `${record.event.expert_info.first_name} ${record.event.expert_info.last_name}`
                                    : record.expert
                                        ? `${record.expert.first_name} ${record.expert.last_name}`
                                        : "Эксперт"}
                                <Div style={{ padding: "8px 0 0 0" }}>
                                    <Text style={{ fontSize: "15px", whiteSpace: "pre-wrap" }}>
                                        {record.comment || "Без комментария"}
                                    </Text>
                                </Div>
                            </SimpleCell>
                        );
                    })
                ) : (
                    <Placeholder title="История пуста">
                        Здесь будет лог всех ваших отзывов об этом эксперте.
                    </Placeholder>
                )}
            </Group>
        </ModalPage>
    );
};
