import React from 'react';
import { Card, Avatar, Title, Text, ContentBadge, Badge } from '@vkontakte/vkui';
import './ExpertCard.css';

const RatingBlock = ({ expertRating, communityRating, showCommunityRating }) => {
    if (!showCommunityRating) {
        return (
            <div className="rating-block single">
                <div className="rating-value">{expertRating}</div>
                <div className="rating-label">Экспертный</div>
            </div>
        );
    }

    return (
        <div className="rating-block double">
            <div className="rating-segment">
                <div className="rating-value">{expertRating}</div>
                <div className="rating-label">Экспертный</div>
            </div>
            <div className="rating-separator"></div>
            <div className="rating-segment">
                <div className="rating-value">{communityRating}</div>
                <div className="rating-label">Народный</div>
            </div>
        </div>
    );
};


export const ExpertCard = ({ expert, topPosition, onClick }) => {
    if (!expert) {
        return null;
    }

    const name = expert.first_name || '';
    const surname = expert.last_name || '';
    const photo = expert.photo_url || '';
    const topics = (expert.topics || []).map(topic => {
        const parts = topic.split(' > ');
        return parts[parts.length - 1];
    });

    const expertRating = expert.stats?.expert || 0;
    const communityRating = expert.stats?.community || 0;

    return (
        <Card
            mode="shadow"
            onClick={onClick}
            className="expert-card-container"
        >
            <div className="expert-card-main">
                <div className="expert-card-position">
                    <Text className="position-number">{topPosition}</Text>
                </div>
                <Avatar size={48} src={photo} />
                <div className="expert-card-info">
                    <Title level="3" className="expert-name">{name} {surname}</Title>
                    {topics.length > 0 && (
                        <div className="expert-topics-container">
                            {topics.map(topic => (
                                <ContentBadge key={topic} mode="primary">{topic}</ContentBadge>
                            ))}
                        </div>
                    )}
                </div>
                <RatingBlock
                    expertRating={expertRating}
                    communityRating={communityRating}
                    showCommunityRating={expert.show_community_rating}
                />
            </div>
        </Card>
    );
};