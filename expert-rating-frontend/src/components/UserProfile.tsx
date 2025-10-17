import React from 'react';
import {
    Group,
    Card,
    Avatar,
    Title,
    Text,
    Div,
    Tooltip,
    IconButton,
    Header,
    SimpleCell,
    Button,
    RichCell,
    Placeholder
} from '@vkontakte/vkui';
import {
    Icon20FavoriteCircleFillYellow,
    Icon20CheckCircleFillGreen,
    Icon24ListBulletSquareOutline,
    Icon28SettingsOutline,
    Icon56RecentOutline,
    Icon20CheckCircleOutline,
    Icon20CancelCircleOutline
} from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

// --- Типизация входных данных ---
interface UserStats {
    expert?: number;
    community?: number;
    events_count?: number;
}

interface MyVotesStats {
    trust?: number;
    distrust?: number;
}

interface UserData {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    is_admin: boolean;
    is_expert: boolean;
    status: 'pending' | 'approved' | 'rejected' | null;
    topics?: string[];
    stats?: UserStats;
    my_votes_stats?: MyVotesStats;
    tariff_plan?: string;
    show_community_rating: boolean;
}

interface UserProfileProps {
    user: UserData | null;
    onSettingsClick: () => void;
}

export const UserProfile = ({ user, onSettingsClick }: UserProfileProps) => {
    if (!user) return null;
    const routeNavigator = useRouteNavigator();

    const getRoleText = () => {
        const roles = [];
        if (user.is_admin) roles.push('Администратор');
        if (user.is_expert) roles.push('Эксперт');
        if (roles.length === 0) return 'Пользователь';
        return roles.join(' | ');
    };

    const isPending = user.status === 'pending';
    const isApprovedExpert = user.is_expert && user.status === 'approved';

    return (
        <Group>
            <Card mode="shadow" style={{ position: 'relative' }}>
                <RichCell
                    before={<Avatar size={96} src={user.photo_url} />}
                    after={isApprovedExpert && (
                        <IconButton onClick={onSettingsClick} aria-label="Настройки профиля">
                            <Icon28SettingsOutline />
                        </IconButton>
                    )}
                    caption={getRoleText()}
                    disabled
                >
                    <Title level="2">{user.first_name} {user.last_name}</Title>

                    {/* Статистика отданных голосов */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <Tooltip description="Отдано голосов 'Доверяю'">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--vkui--color_text_positive)' }}>
                                <Icon20CheckCircleOutline />
                                <Text>{user.my_votes_stats?.trust || 0}</Text>
                            </div>
                        </Tooltip>
                        <Tooltip description="Отдано голосов 'Не доверяю'">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--vkui--color_text_negative)' }}>
                                <Icon20CancelCircleOutline />
                                <Text>{user.my_votes_stats?.distrust || 0}</Text>
                            </div>
                        </Tooltip>
                    </div>

                    {(isApprovedExpert || isPending) && (
                        <Div style={{ textAlign: 'left', color: 'var(--vkui--color_text_secondary)', paddingTop: 8, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }}>
                            <Text>Тариф: {user.tariff_plan || 'Начальный'}</Text>
                        </Div>
                    )}
                </RichCell>

                {isPending && (
                    <Placeholder icon={<Icon56RecentOutline />}>
                        Ваша заявка на становление экспертом находится на модерации.
                    </Placeholder>
                )}

                {isApprovedExpert && user.topics && user.topics.length > 0 && (
                    <Div>
                        <Header mode="tertiary">Направления</Header>
                        {user.topics.map(topic => (
                            <SimpleCell key={topic} disabled multiline>{topic}</SimpleCell>
                        ))}
                    </Div>
                )}

                {isApprovedExpert && (
                    <Div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <Tooltip description="Экспертный рейтинг">
                            <div className="stat-item" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                <Icon20CheckCircleFillGreen />
                                <Title level="3">{user.stats?.expert || 0}</Title>
                            </div>
                        </Tooltip>
                        {user.show_community_rating && (
                            <Tooltip description="Народный рейтинг">
                                <div className="stat-item" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <Icon20FavoriteCircleFillYellow />
                                    <Title level="3">{user.stats?.community || 0}</Title>
                                </div>
                            </Tooltip>
                        )}
                        <Tooltip description="Проведено мероприятий">
                            <div className="stat-item" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                <Icon24ListBulletSquareOutline width={20} height={20} />
                                <Title level="3">{user.stats?.events_count || 0}</Title>
                            </div>
                        </Tooltip>
                    </Div>
                )}

                {!user.is_expert && !isPending && (
                    <Div>
                        <Button
                            stretched
                            size="l"
                            mode="secondary"
                            onClick={() => routeNavigator.push('/registration')}
                        >
                            Стать экспертом
                        </Button>
                    </Div>
                )}
            </Card>
        </Group>
    );
};