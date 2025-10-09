// src/components/VoteCard.jsx

import React, { useState } from 'react';
import {
    Div,
    Button,
    FormItem,
    FormField,
    Textarea,
    Title,
    Text,
    Spacing,
    Group
} from '@vkontakte/vkui';
import { Icon56CheckCircleOutline } from '@vkontakte/icons';

export const VoteCard = ({ onSubmit, onCancelVote, hasVoted }) => {
    const [voteData, setVoteData] = useState({
        vote_type: '',
        comment: ''
    });

    const isSubmitDisabled = voteData.vote_type === 'distrust' && !voteData.comment.trim();

    const handleSubmit = () => {
        onSubmit(voteData);
    };

    if (hasVoted) {
        return (
            <Group>
                <Div style={{ textAlign: 'center' }}>
                    <Icon56CheckCircleOutline style={{ color: 'var(--vkui--color_icon_positive)' }} />
                    <Title level="2" style={{ marginTop: 16 }}>Спасибо за участие!</Title>
                    <Text style={{ marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>Ваш голос уже учтен.</Text>
                </Div>
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
            <Spacing size={8} />
            <Div style={{ display: 'flex', gap: '10px' }}>
                <Button
                    stretched
                    size="l"
                    mode={voteData.vote_type === 'trust' ? 'primary' : 'secondary'}
                    onClick={() => setVoteData(prev => ({ ...prev, vote_type: 'trust' }))}
                >
                    👍 Доверяю
                </Button>
                <Button
                    stretched
                    size="l"
                    mode={voteData.vote_type === 'distrust' ? 'primary' : 'secondary'}
                    onClick={() => setVoteData(prev => ({ ...prev, vote_type: 'distrust' }))}
                >
                    👎 Не доверяю
                </Button>
            </Div>

            <FormItem
                top={voteData.vote_type === 'distrust' ? "Что можно улучшить? (обязательно)" : "Что понравилось? (анонимно, по желанию)"}
                status={isSubmitDisabled ? 'error' : 'default'}
            >
                <FormField>
                    <Textarea
                        value={voteData.comment}
                        onChange={(e) => setVoteData(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder={
                            voteData.vote_type === 'distrust'
                            ? "Например: хотелось бы больше конкретики"
                            : "Например: эксперт дал понятное объяснение"
                        }
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