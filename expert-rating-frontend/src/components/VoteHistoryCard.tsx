import React from 'react';
import { Card, SimpleCell, Avatar, Button, RichCell, Text } from '@vkontakte/vkui';
import { Icon20CancelCircleFillRed, Icon20CheckCircleFillGreen } from '@vkontakte/icons';

// Типизация данных
interface VoteData {
    id: number;
    vote_type: 'trust' | 'distrust';
    is_expert_vote: boolean;
    created_at: string;
    expert?: {
        vk_id: number;
        first_name: string;
        last_name: string;
        photo_url: string;
    };
    event?: {
        id: number;
        name: string;
        expert_info: {
            vk_id: number;
            first_name: string;
            last_name: string;
            photo_url: string;
        };
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

    // Определяем, за что был голос - за эксперта (народный) или за мероприятие
    const target = vote.is_expert_vote ? vote.event?.expert_info : vote.expert;
    const title = vote.is_expert_vote ? `Мероприятие: ${vote.event?.name}` : `${target?.first_name} ${target?.last_name}`;
    const subtitle = `Эксперт: ${target?.first_name} ${target?.last_name}`;

    if (!target) return null;

    return (
        <Card mode="shadow">
            <RichCell
                before={<Avatar size={48} src={target.photo_url} />}
                caption={vote.is_expert_vote ? subtitle : voteDate}
                after={
                    <Button mode="destructive" size="s" onClick={() => onCancelVote(vote.id, vote.is_expert_vote)}>
                        Отменить
                    </Button>
                }
                multiline
            >
                <Text weight="1">{title}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <VoteIcon />
                    <Text style={{ color: 'var(--vkontakte--color_text_secondary)' }}>{voteText}</Text>
                    <Text style={{ color: 'var(--vkontakte--color_text_secondary)', marginLeft: 'auto' }}>
                        {vote.is_expert_vote ? voteDate : 'Народный голос'}
                    </Text>
                </div>
            </RichCell>
        </Card>
    );
};