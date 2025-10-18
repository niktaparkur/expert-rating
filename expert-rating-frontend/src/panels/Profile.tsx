import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    Header,
    Snackbar,
    PullToRefresh,
    PanelHeaderButton,
    useAdaptivity,
    ViewWidth
} from '@vkontakte/vkui';
import { Icon56UsersOutline, Icon16Cancel, Icon16Done, Icon28RefreshOutline } from '@vkontakte/icons';
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
    refetchUser: () => void; // Функция для обновления данных пользователя
}

export const Profile = ({ id, user, setCurrentUser, refetchUser }: ProfileProps) => {
    const { viewWidth } = useAdaptivity();
    const isDesktop = viewWidth >= ViewWidth.TABLET;
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const { apiPut, apiGet, apiDelete, apiPost } = useApi();
    const [popout, setPopout] = useState<React.ReactNode | null>(null);
    const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

    // Состояние для отзыва заявки
    const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
    const [isFetching, setFetching] = useState(false);

    // Состояния для списка голосов
    const [votes, setVotes] = useState<any[]>([]); // TODO: Заменить any на типизацию VoteData
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchVotes = useCallback(async () => {
        setIsLoadingVotes(true);
        try {
            const data = await apiGet('/users/me/votes');
            setVotes(data || []);
        } catch (e) {
            console.error("Failed to load user votes", e);
        } finally {
            setIsLoadingVotes(false);
        }
    }, [apiGet]);

    useEffect(() => {
        fetchVotes();
    }, [fetchVotes]);

    const onRefresh = useCallback(async () => {
        setFetching(true);
        await Promise.all([refetchUser(), fetchVotes()]);
        setFetching(false);
    }, [refetchUser, fetchVotes]);


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
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>Ошибка при отмене голоса</Snackbar>)
        } finally {
            setPopout(null);
        }
    };

    const performWithdraw = async () => {
        setIsWithdrawLoading(true);
        try {
            await apiPost('/experts/withdraw');
            await refetchUser(); // Обновляем данные пользователя глобально
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>Заявка успешно отозвана.</Snackbar>)
        } catch (error) {
            setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>{(error as Error).message}</Snackbar>);
        } finally {
            setIsWithdrawLoading(false);
        }
    };

    // --- НОВАЯ ФУНКЦИЯ: Отзыв заявки с подтверждением ---
    const handleWithdraw = () => {
        setPopout(
            <Alert
                actions={[
                    { title: 'Отмена', mode: 'cancel' },
                    { title: 'Отозвать', mode: 'destructive', action: performWithdraw }
                ]}
                onClose={() => setPopout(null)}
                header="Подтверждение"
                text="Вы уверены, что хотите отозвать заявку? Вы сможете подать ее заново в любой момент."
            />
        );
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
            {snackbar}
            <PanelHeader
                after={isDesktop && <PanelHeaderButton onClick={onRefresh}><Icon28RefreshOutline/></PanelHeaderButton>}
            >
                Аккаунт
            </PanelHeader>
            <PullToRefresh onRefresh={onRefresh} isFetching={isFetching}>
                <UserProfile
                    user={user}
                    onSettingsClick={() => setActiveModal('profile-settings-modal')}
                    onWithdraw={handleWithdraw}
                    isWithdrawLoading={isWithdrawLoading}
                />

                <Group header={<Header>Мои голоса</Header>}>
                    <Search
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по эксперту или мероприятию"
                    />
                    <div style={{ paddingBottom: '60px' }}>
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
            </PullToRefresh>
        </Panel>
    );
};