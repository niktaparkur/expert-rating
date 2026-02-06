import React, { useState } from "react";
import { ModalCard, FormItem, Textarea, Button, Spacing, FormLayoutGroup } from "@vkontakte/vkui";

interface RevokeVoteModalProps {
    id: string;
    onClose: () => void;
    onRevoke: (comment: string) => void;
}

export const RevokeVoteModal = ({ id, onClose, onRevoke }: RevokeVoteModalProps) => {
    const [comment, setComment] = useState("");
    const isValid = comment.trim().length >= 3;

    return (
        <ModalCard
            id={id}
            onClose={onClose}
            title="Отозвать голос"
            description="Вы уверены? Укажите причину (обязательно)."
        >
            <FormLayoutGroup>
                <FormItem>
                    <Textarea
                        placeholder="Почему вы отзываете голос?"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </FormItem>
                <Spacing size={16} />
                <Button
                    size="l"
                    stretched
                    mode="primary"
                    appearance="negative"
                    disabled={!isValid}
                    onClick={() => onRevoke(comment)}
                >
                    Отозвать
                </Button>
            </FormLayoutGroup>
        </ModalCard>
    );
};
