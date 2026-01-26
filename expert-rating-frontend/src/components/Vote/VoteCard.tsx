import React, { useState, useEffect } from "react";
import {
  Div,
  Button,
  FormItem,
  Textarea,
  Group,
  FormStatus,
  ButtonGroup,
} from "@vkontakte/vkui";
import {
  Icon24Like,
  Icon24LikeOutline,
  Icon16CancelCircleOutline,
} from "@vkontakte/icons";

interface VoteCardProps {
  onSubmit: (payload: {
    vote_type: "trust" | "distrust" | "remove";
    comment: string;
  }) => void;
  initialVote: {
    vote_type: string;
    comment?: string;
  } | null;
  setPopout: (popout: React.ReactNode | null) => void;
  onCancelVote?: () => Promise<void>;
}

export const VoteCard: React.FC<VoteCardProps> = ({
  onSubmit,
  initialVote,
}) => {
  const getInitialValue = () => {
    if (!initialVote) return 0;
    return initialVote.vote_type === "trust" ? 1 : -1;
  };

  const [selection, setSelection] = useState<number>(getInitialValue());
  const [comment, setComment] = useState(initialVote?.comment || "");
  const [isRemoveMode, setIsRemoveMode] = useState(false);

  useEffect(() => {
    setSelection(getInitialValue());
    setComment(initialVote?.comment || "");
    setIsRemoveMode(false);
  }, [initialVote]);

  const handleSubmit = () => {
    let type: "trust" | "distrust" | "remove" = "trust";

    if (isRemoveMode) {
      type = "remove";
    } else if (selection === 1) {
      type = "trust";
    } else if (selection === -1) {
      type = "distrust";
    }

    onSubmit({
      vote_type: type,
      comment: comment,
    });
  };

  const initialVoteValue = getInitialValue();

  const handleButtonClick = (val: number) => {
    if (selection === val && initialVoteValue === val) {
      // If clicking the already selected initial vote, switch to remove mode
      setIsRemoveMode(!isRemoveMode);
      setComment(""); // Clear comment on toggle
    } else {
      setSelection(val);
      setIsRemoveMode(false);
      setComment(""); // Clear comment on change
    }
  };

  const getButtonMode = (val: number) => {
    if (selection === val && !isRemoveMode) return "primary";
    return "secondary";
  };

  const getStatusText = () => {
    if (initialVoteValue === 0) return "Проголосуйте за эксперта";

    if (isRemoveMode) {
      return "Вы собираетесь отозвать свой голос. Пожалуйста, укажите причину.";
    }

    if (selection === initialVoteValue) {
      return "Вы можете изменить свой отзыв или нажать на выбранный вариант еще раз, чтобы отозвать голос.";
    }

    return "Вы меняете свое мнение об эксперте.";
  };

  const isSubmitDisabled =
    (selection === 0 && !isRemoveMode) ||
    comment.trim().length < 3;

  return (
    <>
      <Group>
        <FormStatus mode={isRemoveMode ? "error" : "default"}>
          {getStatusText()}
        </FormStatus>

        <Div>
          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button
              size="l"
              stretched
              mode={getButtonMode(1)}
              before={
                selection === 1 && !isRemoveMode ? (
                  <Icon24Like />
                ) : (
                  <Icon24LikeOutline />
                )
              }
              after={
                initialVoteValue === 1 && (
                  <Icon16CancelCircleOutline
                    style={{
                      opacity: isRemoveMode && selection === 1 ? 1 : 0.5,
                      color: isRemoveMode && selection === 1 ? "var(--vkui--color_icon_negative)" : "inherit"
                    }}
                  />
                )
              }
              onClick={() => handleButtonClick(1)}
            >
              {initialVoteValue === 1 ? "Убрать голос" : "Доверяю"}
            </Button>
            <Button
              size="l"
              stretched
              mode={getButtonMode(-1)}
              before={
                selection === -1 && !isRemoveMode ? (
                  <Icon24Like style={{ transform: "rotate(180deg)" }} />
                ) : (
                  <Icon24LikeOutline style={{ transform: "rotate(180deg)" }} />
                )
              }
              after={
                initialVoteValue === -1 && (
                  <Icon16CancelCircleOutline
                    style={{
                      opacity: isRemoveMode && selection === -1 ? 1 : 0.5,
                      color: isRemoveMode && selection === -1 ? "var(--vkui--color_icon_negative)" : "inherit"
                    }}
                  />
                )
              }
              onClick={() => handleButtonClick(-1)}
            >
              {initialVoteValue === -1 ? "Убрать голос" : "Не доверяю"}
            </Button>
          </ButtonGroup>
        </Div>

        <FormItem top={isRemoveMode ? "Причина отзыва голоса (обязательно)" : "Ваш отзыв (обязательно)"}>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isRemoveMode
                ? "Почему вы решили отозвать голос?"
                : "Что вам понравилось или не понравилось?"
            }
          />
        </FormItem>
      </Group>

      <Div>
        <Button
          size="l"
          stretched
          appearance={isRemoveMode ? "negative" : "accent"}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isRemoveMode ? "Удалить голос" : initialVoteValue !== 0 ? "Сохранить изменения" : "Отправить"}
        </Button>
      </Div>
    </>
  );
};