// src/components/ExpertProfileCard.jsx

import React from 'react';
import {
    Card,
    Avatar,
    Title,
    Text,
    Div,
    Tooltip,
    Header,
    IconButton
} from '@vkontakte/vkui';
import {
    Icon20FavoriteCircleFillYellow,
    Icon20CheckCircleFillGreen,
    Icon24ListBulletSquareOutline,
    Icon28Profile,
    Icon28Users3Outline,
    Icon28AdvertisingOutline
} from '@vkontakte/icons';
import './ExpertProfileCard.css';

export const ExpertProfileCard = ({ expert, onVoteClick, onFutureFeatureClick }) => {
    if (!expert) return null;

    const name = expert.first_name || '';
    const surname = expert.last_name || '';
    const photo = expert.photo_url || '';
    const regalia = expert.regalia || '';
    const social_link = expert.social_link || '#';
    const topics = expert.topics || [];

    const stats = expert.stats || {};
    const communityRating = stats.community || 0;
    const expertRating = stats.expert || 0;
    const eventsCount = stats.events_count || 0;

    return (
        <Card mode="shadow">
            <Div className="expert-profile-header">
                <Avatar size={96} src={expert.photo_url} />
                <div className="expert-profile-name-container">
                    <Tooltip description="Перейти в профиль эксперта" placement="top">
                        <IconButton href={expert.social_link} target="_blank" aria-label="Перейти в профиль ВКонтакте">
                            <Icon28Profile />
                        </IconButton>
                    </Tooltip>
                    <Title level="2" className="expert-profile-name">{expert.first_name} {expert.last_name}</Title>
                </div>
            </Div>

            <div className="expert-profile-stats">
                <Tooltip description="Экспертный рейтинг">
                    <div className="stat-item">
                        <Icon20CheckCircleFillGreen width={28} height={28} />
                        <Text className="stat-value">{expertRating}</Text>
                    </div>
                </Tooltip>
                {expert.show_community_rating && (
                    <Tooltip description="Народный рейтинг">
                        <div className="stat-item" onClick={onVoteClick}>
                            <Icon20FavoriteCircleFillYellow width={28} height={28} />
                            <Text className="stat-value">{communityRating}</Text>
                        </div>
                    </Tooltip>
                )}

                <Tooltip description="Проведено мероприятий">
                    <div className="stat-item">
                        <Icon24ListBulletSquareOutline width={28} height={28} />
                        <Text className="stat-value">{eventsCount}</Text>
                    </div>
                </Tooltip>
            </div>

            {regalia && (
                <Div>
                    <Header mode="tertiary">О себе</Header>
                    <Text className="expert-profile-regalia">{regalia}</Text>
                </Div>
            )}

            {topics.length > 0 && (
                <div className="topics-section-container">
                    <Header mode="tertiary">Направления:</Header>
                    <div className="topics-list">
                        {topics.map(topic => (
                           <Text key={topic} className="topic-list-item">{topic}</Text>
                        ))}
                    </div>
                </div>
            )}

            <Div className="expert-profile-actions">
                <Tooltip description="Пригласить на мероприятие (в разработке)" placement="bottom">
                    <IconButton className="action-item-small" onClick={onFutureFeatureClick} aria-label="Пригласить на мероприятие">
                        <Icon28Users3Outline />
                    </IconButton>
                </Tooltip>
                <Tooltip description="Пригласить на продюсирование (в разработке)" placement="bottom">
                    <IconButton className="action-item-small" onClick={onFutureFeatureClick} aria-label="Пригласить на продюсирование">
                        <Icon28AdvertisingOutline />
                    </IconButton>
                </Tooltip>
            </Div>
        </Card>
    );
};