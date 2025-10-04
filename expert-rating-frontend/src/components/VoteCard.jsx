import React, { useState } from 'react';
import {
    Card,
    Div,
    Button,
    FormItem,
    FormField,
    Textarea,
    Title,
    Text,
    Spacing
} from '@vkontakte/vkui';
import {
    Icon56CheckCircleOutline,
    Icon56LockOutline,
    Icon56UserCircleOutline
} from '@vkontakte/icons';

export const VoteCard = ({ title, subtitle, onSubmit, disabled, voted = false, voteType }) => {
    const [voteData, setVoteData] = useState({
        vote_type: '',
        comment_positive: '',
        comment_negative: ''
    });

    const handleSubmit = () => {
        if (!voteData.vote_type) {
            alert('Выберите, доверяете ли вы эксперту');
            return;
        }
        onSubmit(voteData);
    };

    // Универсальный стиль карточки
    const baseCardStyle = {
        borderRadius: 16,
        overflow: 'hidden',
        paddingBottom: 12
    };

    const headerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        gap: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    };


    const titleStyle = {
        marginTop: 4,
    };

    const subtitleStyle = {
        fontSize: 15,
    };

    // --- Завершённое голосование ---
    if (disabled) {
        return (
            <Card mode="shadow" style={baseCardStyle}>
                <Div style={headerStyle}>
                    <Icon56LockOutline fill="rgba(255,255,255,0.6)" />
                    <Title level="2" weight="2" style={titleStyle}>
                        Голосование завершено
                    </Title>
                    <Text style={subtitleStyle}>Вы уже не можете проголосовать.</Text>
                </Div>
            </Card>
        );
    }

    // --- Уже проголосовал ---
    if (voted) {
        return (
            <Card mode="shadow" style={baseCardStyle}>
                <Div style={headerStyle}>
                    <Icon56CheckCircleOutline fill="#62de84" />
                    <Title level="2" weight="2" style={titleStyle}>
                        Спасибо за участие!
                    </Title>
                    <Text style={subtitleStyle}>
                        Ваш голос учтён в категории{' '}
                        <b>{voteType === 'expert' ? 'Экспертное' : 'Народное'}</b> голосование.
                    </Text>
                </Div>
            </Card>
        );
    }

    // --- Активная карточка ---
    return (
        <Card mode="shadow" style={baseCardStyle}>
            <Div style={headerStyle}>
                <Icon56UserCircleOutline fill="#7aa2ff" />
                <Title level="2" weight="2" style={titleStyle}>
                    {title}
                </Title>
                {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
            </Div>

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

            <FormItem top="Что понравилось? (анонимно)">
                <FormField>
                    <Textarea
                        value={voteData.comment_positive}
                        onChange={(e) =>
                            setVoteData(prev => ({ ...prev, comment_positive: e.target.value }))
                        }
                        placeholder="Например: эксперт дал понятное объяснение"
                    />
                </FormField>
            </FormItem>

            <FormItem top="Что можно улучшить? (анонимно)">
                <FormField>
                    <Textarea
                        value={voteData.comment_negative}
                        onChange={(e) =>
                            setVoteData(prev => ({ ...prev, comment_negative: e.target.value }))
                        }
                        placeholder="Например: хотелось бы больше конкретики"
                    />
                </FormField>
            </FormItem>

            <Div>
                <Button size="l" stretched mode="primary" onClick={handleSubmit}>
                    Проголосовать
                </Button>
            </Div>
        </Card>
    );
};
