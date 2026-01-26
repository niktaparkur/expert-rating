import React, { useState, useEffect } from "react";
import {
  Div,
  Button,
  FormItem,
  Textarea,
  Group,
  FormStatus,
  ButtonGroup
} from "@vkontakte/vkui";
import { Icon24Like, Icon24LikeOutline, Icon24DeleteOutline } from "@vkontakte/icons";

interface VoteCardProps {
  onSubmit: (payload: {
    vote_type: "trust" | "distrust" | "remove";
    comment: string;
  }) => void;
  initialVoteValue: number; // 1 (Trust), -1 (Distrust), 0 (None)
  setPopout: (popout: React.ReactNode | null) => void;
  onCancelVote?: () => Promise<void>;
}

export const VoteCard: React.FC<VoteCardProps> = ({
  onSubmit,
  initialVoteValue,
}) => {
  const [selection, setSelection] = useState<number>(initialVoteValue);
  const [comment, setComment] = useState("");
  const [isRemoveMode, setIsRemoveMode] = useState(false);

  useEffect(() => {
    setSelection(initialVoteValue);
    setIsRemoveMode(false);
  }, [initialVoteValue]);

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

  const getButtonMode = (val: number) => {
    if (isRemoveMode) return "secondary";
    if (selection === val) return "primary";
    return "secondary";
  };

  const getStatusText = () => {
    if (initialVoteValue === 0) return "Проголосуйте за эксперта";

    if (selection === initialVoteValue && !isRemoveMode) {
        return "Вы уже голосовали так. Оставьте отзыв, чтобы подтвердить мнение.";
    }
    if (isRemoveMode) {
        return "Вы собираетесь отозвать свой голос.";
    }
    return "Вы меняете свое мнение об эксперте.";
  };

  const isSubmitDisabled = (!isRemoveMode && selection === 0) || comment.trim().length < 3;

  return (
    <>
      <Group>
        <FormStatus mode="default">
          {getStatusText()}
        </FormStatus>

        <Div style={{paddingBottom: 0}}>
            <ButtonGroup mode="horizontal" gap="m" stretched>
              <Button
                size="l"
                stretched
                mode={getButtonMode(1)}
                before={selection === 1 && !isRemoveMode ? <Icon24Like /> : <Icon24LikeOutline />}
                onClick={() => {
                    setSelection(1);
                    setIsRemoveMode(false);
                }}
              >
                Доверяю
              </Button>
              <Button
                size="l"
                stretched
                mode={getButtonMode(-1)}
                before={selection === -1 && !isRemoveMode ? <Icon24Like style={{transform: "rotate(180deg)"}}/> : <Icon24LikeOutline style={{transform: "rotate(180deg)"}}/>}
                onClick={() => {
                    setSelection(-1);
                    setIsRemoveMode(false);
                }}
              >
                Не доверяю
              </Button>
            </ButtonGroup>
        </Div>

        {initialVoteValue !== 0 && (
            <Div style={{paddingTop: 8}}>
                <Button
                    size="m"
                    mode={isRemoveMode ? "primary" : "tertiary"}
                    appearance={isRemoveMode ? "negative" : "accent"}
                    before={<Icon24DeleteOutline />}
                    onClick={() => setIsRemoveMode(!isRemoveMode)}
                >
                    {isRemoveMode ? "Отменить отзыв голоса" : "Отозвать голос"}
                </Button>
            </Div>
        )}

        <FormItem top="Ваш отзыв (обязательно)">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isRemoveMode ? "Почему вы решили отозвать голос?" : "Что вам понравилось или не понравилось?"}
          />
        </FormItem>
      </Group>

      <Div>
        <Button
          size="l"
          stretched
          mode={isRemoveMode ? "tertiary" : "primary"}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isRemoveMode ? "Удалить голос" : "Отправить"}
        </Button>
      </Div>
    </>
  );
};