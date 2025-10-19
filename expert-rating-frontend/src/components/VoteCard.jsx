// src/components/VoteCard.jsx

import React, { useState, useEffect } from 'react';
import {
    Div,
    Button,
    FormItem,
    FormField,
    Textarea,
    Group,
    Spacing
} from '@vkontakte/vkui';

export const VoteCard = ({ onSubmit, onCancelVote, hasVoted, initialVote }) => {
    const [voteData, setVoteData] = useState({
        vote_type: '',
        comment: ''
    });

    // Инициализируем состояние, если пользователь уже голосовал
    useEffect(() => {
        if (hasVoted && initialVote) {
            setVoteData({
                vote_type: initialVote.vote_type || '',
                comment: initialVote.comment || ''
            });
        }
    }, [hasVoted, initialVote]);


    const isSubmitDisabled = !voteData.vote_type || !voteData.comment.trim();

    const handleSubmit = () => {
        onSubmit(voteData);
    };

    if (hasVoted) {
        return (
            <Group>
                <Spacing size={8}/>
                <Div style={{display: 'flex', gap: '10px'}}>
                    <Button
                        stretched
                        size="l"
                        mode={voteData.vote_type === 'trust' ? 'primary' : 'secondary'}
                        disabled
                    >
                        👍 Доверяю
                    </Button>
                    <Button
                        stretched
                        size="l"
                        mode={voteData.vote_type === 'distrust' ? 'primary' : 'secondary'}
                        disabled
                    >
                        👎 Не доверяю
                    </Button>
                </Div>

                <FormItem top="Ваш отзыв">
                    <FormField>
                        <Textarea
                            value={voteData.comment}
                            disabled
                        />
                    </FormField>
                </FormItem>

                <Div>
                    <Button size="l" stretched mode="destructive" onClick={onCancelVote}>
                        Отменить голос
                    </Button>
                </Div>
            </Group>
        );
    }

    return (
        <Group>
            <Spacing size={8}/>
            <Div style={{display: 'flex', gap: '10px'}}>
                <Button
                    stretched
                    size="l"
                    mode={voteData.vote_type === 'trust' ? 'primary' : 'secondary'}
                    onClick={() => setVoteData(prev => ({...prev, vote_type: 'trust'}))}
                >
                    👍 Доверяю
                </Button>
                <Button
                    stretched
                    size="l"
                    mode={voteData.vote_type === 'distrust' ? 'primary' : 'secondary'}
                    onClick={() => setVoteData(prev => ({...prev, vote_type: 'distrust'}))}
                >
                    👎 Не доверяю
                </Button>
            </Div>

            <FormItem
                top="Ваш отзыв (обязательно)"
                status={isSubmitDisabled && voteData.vote_type ? 'error' : 'default'}
            >
                <FormField>
                    <Textarea
                        value={voteData.comment}
                        onChange={(e) => setVoteData(prev => ({...prev, comment: e.target.value}))}
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