import React, { useState, useEffect, useMemo } from 'react';
import {
    Panel,
    PanelHeader,
    Group,
    ModalRoot,
    ModalPage,
    ModalPageHeader,
    Switch,
    SimpleCell,
    Search,
    Placeholder,
    Spinner,
    Alert,
    Header
} from '@vkontakte/vkui';
import { Icon56UsersOutline } from '@vkontakte/icons';
import { UserProfile } from '../components/UserProfile';
import { VoteHistoryCard } from '../components/VoteHistoryCard';
import { useApi } from '../hooks/useApi';

// --- Типизация входных данных ---
interface UserData {
    vk_id: number;
    // ... (добавьте все поля, которые есть в UserData из UserProfile.tsx)
    is_expert: boolean;
    show_community_rating: boolean;
}

interface ProfileProps {
    id: string;
    user: UserData | null;
    setCurrentUser: (user: UserData | null) => void;
}

export const Profile = ({ id, user, setCurrentUser }: ProfileProps) => {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const { apiPut, apiGet, apiDelete } = useApi();
    const [popout, setPopout] = useState<React.ReactNode | null>(null);

    // Состояния для списка голосов
    const [votes, setVotes] = useState<any[]>([]); // TODO: Заменить any на типизацию VoteData
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsLoadingVotes(true);
        apiGet('/users/me/votes')
            .then(data => setVotes(data || []))
            .catch(e => console.error("Failed to load user votes", e))
            .finally(() => setIsLoadingVotes(false));
    }, [apiGet]);

    const handleSettingsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { checked } = e.target;

        if (user) {
            setCurrentUser({ ...user, show_community_rating: checked });
        }

        try {
            const updatedUser = await apiPut('/users/me/settings', { show_community_rating: checked });
            setCurrentUser(updatedUser);
        } catch (error) {
            console.error("Failed to update settings:", error);
            if (user) {
                setCurrentUser({ ...user, show_community_rating: !checked });
            }
        }
    };

    const handleCancelVote = (voteId: number, isExpertVote: boolean) => {
        setPopout(
            <Alert
                actions={[
                    { title: 'Отмена', mode: 'cancel' },
                    { title: 'Подтвердить', mode: 'destructive', action: () => performCancelVote(voteId, isExpertVote) }
                ]}
                onClose={() => setPopout(null)}
                header="Подтверждение"
                text="Вы уверены, что хотите отменить свой голос? Это действие необратимо."
            />
        );
    };

    const performCancelVote = async (voteId: number, isExpertVote: boolean) => {
        // TODO: Эти эндпоинты нужно будет создать на бэкенде
        const endpoint = isExpertVote ? `/events/vote/${voteId}/cancel` : `/experts/vote/${voteId}/cancel`;

        setPopout(<Spinner size="large" />);
        try {
            await apiDelete(endpoint);
            // Обновляем список голосов, удаляя отмененный
            setVotes(prevVotes => prevVotes.filter(vote => vote.id !== voteId));
        } catch(error) {
            console.error("Failed to cancel vote", error);
            // TODO: Показать Snackbar с ошибкой
        } finally {
            setPopout(null);
        }
    };

    const filteredVotes = useMemo(() => {
        if (!votes) return [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return votes;
        return votes.filter(vote => {
            const target = vote.is_expert_vote ? vote.event?.expert_info : vote.expert;
            const eventName = vote.event?.name || '';
            const expertName = `${target?.first_name || ''} ${target?.last_name || ''}`;
            return eventName.toLowerCase().includes(query) || expertName.toLowerCase().includes(query);
        });
    }, [searchQuery, votes]);

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage
                id="profile-settings-modal"
                onClose={() => setActiveModal(null)}
                header={<ModalPageHeader>Настройки профиля</ModalPageHeader>}
            >
                <Group>
                    <SimpleCell
                        Component="label"
                        disabled={!user?.is_expert}
                        after={
                            <Switch
                                checked={user?.show_community_rating ?? true}
                                onChange={handleSettingsChange}
                            />
                        }
                    >
                        Показывать мой народный рейтинг
                    </SimpleCell>
                </Group>
            </ModalPage>
        </ModalRoot>
    );

    return (
        <Panel id={id} popout={popout}>
            {modal}
            <PanelHeader>Аккаунт</PanelHeader>
            <UserProfile user={user} onSettingsClick={() => setActiveModal('profile-settings-modal')} />

            <Group header={<Header>Мои голоса</Header>}>
                <Search
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по эксперту или мероприятию"
                />
                <div style={{ paddingBottom: '12px' }}>
                    {isLoadingVotes ? <Spinner /> : (
                        filteredVotes.length > 0 ? (
                            filteredVotes.map(vote => (
                                <VoteHistoryCard key={vote.id} vote={vote} onCancelVote={handleCancelVote} />
                            ))
                        ) : (
                            <Placeholder icon={<Icon56UsersOutline />} header="Вы еще не голосовали">
                                Ваш голос помогает формировать честный рейтинг.
                            </Placeholder>
                        )
                    )}
                </div>
            </Group>
        </Panel>
    );
};