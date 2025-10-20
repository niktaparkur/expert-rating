import React, { useState, useEffect } from 'react';
import {
    Div,
    Button,
    FormItem,
    FormField,
    Textarea,
    Group,
    Spacing,
    FormStatus
} from '@vkontakte/vkui';

export const VoteCard = ({ onSubmit, initialVote }) => {
    // Состояние для данных формы
    const [voteType, setVoteType] = useState('');
    const [comment, setComment] = useState('');
    const [neutralComment, setNeutralComment] = useState('');

    // Состояние для управления UI
    const [isNeutralizing, setIsNeutralizing] = useState(false);

    // Эффект для заполнения формы, если пользователь уже голосовал
    useEffect(() => {
        if (initialVote) {
            setVoteType(initialVote.vote_type);
            setComment(initialVote.comment || '');
        } else {
            // Сбрасываем состояние, если голоса нет
            setVoteType('');
            setComment('');
            setNeutralComment('');
            setIsNeutralizing(false);
        }
    }, [initialVote]);

    // Определяем, что кнопка отправки должна быть заблокирована
    const isSubmitDisabled = !voteType || !comment.trim();
    const isNeutralizeSubmitDisabled = !neutralComment.trim();

    // Обработчик для создания/обновления голоса
    const handleSubmit = () => {
        const payload = {
            vote_type: voteType,
            comment_positive: voteType === 'trust' ? comment : null,
            comment_negative: voteType === 'distrust' ? comment : null,
        };
        onSubmit(payload);
    };

    // Обработчик для отмены (нейтрализации) голоса
    const handleNeutralizeSubmit = () => {
        const payload = {
            vote_type: 'neutral',
            comment_neutral: neutralComment,
        };
        onSubmit(payload);
        setIsNeutralizing(false); // Скрываем форму после отправки
    };

    // --- РЕНДЕРИНГ, ЕСЛИ ПОЛЬЗОВАТЕЛЬ УЖЕ ГОЛОСОВАЛ ---
    if (initialVote) {
        return (
            <Group>
                <Spacing size={8}/>
                <Div style={{display: 'flex', gap: '10px'}}>
                    <Button
                        stretched size="l"
                        mode={initialVote.vote_type === 'trust' ? 'primary' : 'secondary'}
                        // Кнопка становится "Отменить", если выбрана
                        onClick={() => setIsNeutralizing(true)}
                        disabled={isNeutralizing || initialVote.vote_type !== 'trust'}
                    >
                        👍 Доверяю
                    </Button>
                    <Button
                        stretched size="l"
                        mode={initialVote.vote_type === 'distrust' ? 'primary' : 'secondary'}
                        onClick={() => setIsNeutralizing(true)}
                        disabled={isNeutralizing || initialVote.vote_type !== 'distrust'}
                    >
                        👎 Не доверяю
                    </Button>
                </Div>

                <FormItem top="Ваш предыдущий отзыв">
                    <FormField><Textarea value={comment} disabled /></FormField>
                </FormItem>

                {/* --- Форма отмены голоса (появляется по клику) --- */}
                {isNeutralizing && (
                    <>
                        <FormItem top="Причина отмены голоса (обязательно)">
                            <FormField>
                                <Textarea
                                    value={neutralComment}
                                    onChange={(e) => setNeutralComment(e.target.value)}
                                    placeholder="Например: изменил(а) свое мнение после дополнительной информации."
                                />
                            </FormField>
                        </FormItem>
                        <Div style={{display: 'flex', gap: '8px'}}>
                            <Button size="l" stretched mode="secondary" onClick={() => setIsNeutralizing(false)}>
                                Не отменять
                            </Button>
                            <Button size="l" stretched appearance="negative" onClick={handleNeutralizeSubmit} disabled={isNeutralizeSubmitDisabled}>
                                Подтвердить отмену
                            </Button>
                        </Div>
                    </>
                )}
            </Group>
        );
    }

    // --- РЕНДЕРИНГ, ЕСЛИ ПОЛЬЗОВАТЕЛЬ ЕЩЕ НЕ ГОЛОСОВАЛ ---
    return (
        <Group>
            <FormStatus header="Ваше мнение важно" mode="default">
                Выберите один из вариантов и оставьте комментарий, чтобы ваш голос был учтен.
            </FormStatus>
            <Div style={{display: 'flex', gap: '10px'}}>
                <Button stretched size="l" mode={voteType === 'trust' ? 'primary' : 'secondary'} onClick={() => setVoteType('trust')}>
                    👍 Доверяю
                </Button>
                <Button stretched size="l" mode={voteType === 'distrust' ? 'primary' : 'secondary'} onClick={() => setVoteType('distrust')}>
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

            <Div>
                <Button size="l" stretched mode="primary" onClick={handleSubmit} disabled={isSubmitDisabled}>
                    Проголосовать
                </Button>
            </Div>
        </Group>
    );
};