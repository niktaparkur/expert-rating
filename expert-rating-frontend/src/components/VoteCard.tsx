import React, { useState, useEffect } from "react";
import {
  Div,
  Button,
  FormItem,
  FormField,
  Textarea,
  Group,
  FormStatus,
  Alert,
} from "@vkontakte/vkui";

interface InitialVote {
  vote_type: "trust" | "distrust";
  comment?: string;
}

interface VoteCardProps {
  onSubmit: (payload: {
    vote_type: "trust" | "distrust";
    comment_positive?: string | null;
    comment_negative?: string | null;
  }) => void;
  onCancelVote: () => Promise<void>;
  initialVote?: InitialVote | null;
  setPopout: (popout: React.ReactNode | null) => void;
}

export const VoteCard: React.FC<VoteCardProps> = ({
  onSubmit,
  onCancelVote,
  initialVote,
  setPopout,
}) => {
  const [voteType, setVoteType] = useState<"trust" | "distrust" | "">("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (initialVote) {
      setVoteType(initialVote.vote_type);
      setComment(initialVote.comment || "");
    } else {
      setVoteType("");
      setComment("");
    }
  }, [initialVote]);

  const showCancelAlert = () => {
    setPopout(
      <Alert
        actions={[
          { title: "Не отменять", mode: "cancel" },
          { title: "Подтвердить", mode: "destructive", action: handleCancel },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение отмены"
        description="Вы уверены, что хотите отменить свой голос? Это действие нельзя будет отменить."
      />,
    );
  };

  const handleCancel = async () => {
    try {
      await onCancelVote();
    } catch (error) {
      // Error handling is in the parent component
    }
  };

  const isSubmitDisabled = !voteType || !comment.trim();

  const handleSubmit = () => {
    const payload = {
      vote_type: voteType as "trust" | "distrust",
      comment_positive: voteType === "trust" ? comment : null,
      comment_negative: voteType === "distrust" ? comment : null,
    };
    onSubmit(payload);
  };

  if (initialVote) {
    return (
      <>
        <Group>
          <FormStatus title="Ваш голос учтен">
            Вы уже проголосовали за этого эксперта.
          </FormStatus>
          <FormItem top="Ваш отзыв">
            <FormField>
              <Textarea value={comment} disabled />
            </FormField>
          </FormItem>
        </Group>
        <Div>
          <Button
            size="l"
            stretched
            mode="secondary"
            appearance="negative"
            onClick={showCancelAlert}
          >
            Отменить голос
          </Button>
        </Div>
      </>
    );
  }

  return (
    <>
      <Group>
        <FormStatus title="Ваше мнение важно" mode="default">
          Выберите один из вариантов и оставьте комментарий, чтобы ваш голос был
          учтен.
        </FormStatus>
        <Div style={{ display: "flex", gap: "10px" }}>
          <Button
            stretched
            size="l"
            mode={voteType === "trust" ? "primary" : "secondary"}
            onClick={() => setVoteType("trust")}
          >
            👍 Доверяю
          </Button>
          <Button
            stretched
            size="l"
            mode={voteType === "distrust" ? "primary" : "secondary"}
            onClick={() => setVoteType("distrust")}
          >
            👎 Не доверяю
          </Button>
        </Div>

        <FormItem top="Ваш отзыв (обязательно)">
          <FormField>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: эксперт отлично владеет темой, рекомендую!"
            />
          </FormField>
        </FormItem>
      </Group>
      <Div>
        <Button
          size="l"
          stretched
          mode="primary"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          Проголосовать
        </Button>
      </Div>
    </>
  );
};
