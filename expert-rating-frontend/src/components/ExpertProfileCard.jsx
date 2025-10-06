import React from 'react';
import { Card, Avatar, Title, Text, Div, Tooltip } from '@vkontakte/vkui';
import {
    Icon20FavoriteCircleFillYellow,
    Icon20CheckCircleFillGreen,
    Icon24ListBulletSquareOutline,
    Icon28Profile,
    Icon28Users3Outline,
    Icon28AdvertisingOutline,
    Icon28DiscussionsCircleFillGreen
} from '@vkontakte/icons';
import './ExpertProfileCard.css';

export const ExpertProfileCard = ({ expert, onVoteClick, onFutureFeatureClick }) => {
    if (!expert) return null;

    const name = expert.first_name || '';
    const surname = expert.last_name || '';
    const photo = expert.photo_url || '';
    const regalia = expert.regalia || 'Информация о себе не указана.';
    const social_link = expert.social_link || '#';

    const stats = expert.stats || {};
    const narodnyRating = stats.narodny || 0;
    const expertRating = stats.expert || 0;
    const eventsCount = stats.meropriyatiy || 0;

    return (
        <Card mode="shadow">
            <Div className="expert-profile-header">
                <Avatar size={96} src={photo} />
                <Title level="2" className="expert-profile-name">{name} {surname}</Title>
                <Text className="expert-profile-regalia">{regalia}</Text>

                <div className="expert-profile-stats">
                    <Tooltip description={`Народный рейтинг: ${narodnyRating}`} placement="top">
                        <div className="stat-item">
                            <Icon20FavoriteCircleFillYellow width={28} height={28} />
                            <Text className="stat-value">{narodnyRating}</Text>
                        </div>
                    </Tooltip>
                    <Tooltip description={`Экспертный рейтинг: ${expertRating}`} placement="top">
                        <div className="stat-item">
                            <Icon20CheckCircleFillGreen width={28} height={28} />
                            <Text className="stat-value">{expertRating}</Text>
                        </div>
                    </Tooltip>
                    <Tooltip description={`Проведено мероприятий: ${eventsCount}`} placement="top">
                        <div className="stat-item">
                            <Icon24ListBulletSquareOutline width={28} height={28} />
                            <Text className="stat-value">{eventsCount}</Text>
                        </div>
                    </Tooltip>
                </div>

                <Div className="expert-profile-actions">
                    <Tooltip description="Перейти в профиль эксперта" placement="bottom">
                        <a href={social_link} target="_blank" rel="noopener noreferrer" className="action-item">
                            <Icon28Profile width={36} height={36} />
                        </a>
                    </Tooltip>
                    <Tooltip description="Народный рейтинг (проголосовать)" placement="bottom">
                        <div className="action-item" onClick={onVoteClick}>
                            <Icon28DiscussionsCircleFillGreen width={36} height={36}/>
                        </div>
                    </Tooltip>
                    <Tooltip description="Пригласить на мероприятие (в разработке)" placement="bottom">
                        <div className="action-item" onClick={onFutureFeatureClick}>
                            <Icon28Users3Outline width={36} height={36}/>
                        </div>
                    </Tooltip>
                    <Tooltip description="Пригласить на продюсирование (в разработке)" placement="bottom">
                        <div className="action-item" onClick={onFutureFeatureClick}>
                            <Icon28AdvertisingOutline width={36} height={36}/>
                        </div>
                    </Tooltip>
                </Div>
            </Div>
        </Card>
    );
};