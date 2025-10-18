import React from 'react';
import { Card, RichCell, Avatar, Button, Text } from '@vkontakte/vkui';
import { Icon20CancelCircleFillRed, Icon20CheckCircleFillGreen, Icon28CalendarOutline } from '@vkontakte/icons';

// Типизация данных
interface VotedExpertInfo {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
}

interface VoteData {
    id: number;
    vote_type: 'trust' | 'distrust';
    is_expert_vote: boolean;
    created_at: string;
    expert?: VotedExpertInfo;
    event?: {
        id: number;
        name: string;
        expert_info: VotedExpertInfo;
    };
}

interface VoteHistoryCardProps {
    vote: VoteData;
    onCancelVote: (voteId: number, isExpertVote: boolean) => void;
}


export const VoteHistoryCard = ({ vote, onCancelVote }: VoteHistoryCardProps) => {
    const voteDate = new Date(vote.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const VoteIcon = vote.vote_type === 'trust' ? Icon20CheckCircleFillGreen : Icon20CancelCircleFillRed;
    const voteText = vote.vote_type === 'trust' ? 'Доверие' : 'Недоверие';

    // --- РЕНДЕРИНГ НАРОДНОГО ГОЛОСА ---
    if (!vote.is_expert_vote && vote.expert) {
        return (
            <Card mode="shadow">
                <RichCell
                    before={<Avatar size={48} src={vote.expert.photo_url} />}
                    caption={voteDate}
                    after={
                        <Button mode="destructive" size="s" onClick={() => onCancelVote(vote.id, vote.is_expert_vote)}>
                            Отменить
                        </Button>
                    }
                    multiline
                >
                    <Text weight="1">{vote.expert.first_name} {vote.expert.last_name}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <VoteIcon />
                        <Text style={{ color: 'var(--vkontakte--color_text_secondary)' }}>{voteText}</Text>
                        <Text style={{ color: 'var(--vkontakte--color_text_secondary)', marginLeft: 'auto' }}>
                            Народный голос
                        </Text>
                    </div>
                </RichCell>
            </Card>
        );
    }

    // --- РЕНДЕРИНГ ГОЛОСА ЗА МЕРОПРИЯТИЕ ---
    if (vote.is_expert_vote && vote.event) {
        const expert = vote.event.expert_info;
        return (
             <Card mode="shadow">
                <RichCell
                    before={<Avatar size={48}><Icon28CalendarOutline/></Avatar>}
                    caption={`Эксперт: ${expert.first_name} ${expert.last_name}`}
                    after={
                        <Button mode="destructive" size="s" onClick={() => onCancelVote(vote.id, vote.is_expert_vote)}>
                            Отменить
                        </Button>
                    }
                    multiline
                >
                    <Text weight="1">Мероприятие: {vote.event.name}</Text>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <VoteIcon />
                        <Text style={{ color: 'var(--vkontakte--color_text_secondary)' }}>{voteText}</Text>
                        <Text style={{ color: 'var(--vkontakte--color_text_secondary)', marginLeft: 'auto' }}>
                           {voteDate}
                        </Text>
                    </div>
                </RichCell>
            </Card>
        )
    }

    return null;
};