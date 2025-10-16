import React, { useState, useEffect, useCallback } from 'react';
import {
    Epic, Tabbar, TabbarItem, SplitLayout, SplitCol, View, AppRoot,
    ModalRoot, ModalCard, FormItem, FormField, Input, Button, ScreenSpinner, Tooltip, Spinner, Snackbar, Avatar
} from '@vkontakte/vkui';
import { useActiveVkuiLocation, useRouteNavigator, useSearchParams } from '@vkontakte/vk-mini-apps-router';
import {
    Icon28ArticleOutline, Icon28CalendarOutline, Icon28MoneyCircleOutline,
    Icon28UserCircleOutline, Icon24CheckCircleFilledBlue, Icon28CheckShieldOutline, Icon16Done, Icon16Cancel
} from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';
import debounce from 'lodash.debounce';
import { Onboarding } from './components/Onboarding.jsx';
import { useApi } from "./hooks/useApi.js";
import { Home, Registration, Admin, Events, CreateEvent, Voting, ExpertProfile, Tariffs, Profile } from './panels';
import {
    VIEW_MAIN, VIEW_EVENTS, VIEW_TARIFFS, VIEW_PROFILE,
    PANEL_HOME, PANEL_REGISTRATION, PANEL_EVENTS, PANEL_CREATE_EVENT,
    PANEL_ADMIN, PANEL_VOTING, PANEL_EXPERT_PROFILE,
    PANEL_TARIFFS, PANEL_PROFILE
} from './routes';


export const App = () => {
    const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } = useActiveVkuiLocation();
    const routeNavigator = useRouteNavigator();
    const { apiGet, apiPost } = useApi();
    const [popout, setPopout] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [promoWord, setPromoWord] = useState('');
    const [snackbar, setSnackbar] = useState(null);

    const [searchParams] = useSearchParams();
    const hasLaunchParams = searchParams.toString().length > 0;
    const [showOnboarding, setShowOnboarding] = useState(
        !localStorage.getItem('onboardingFinished') && !hasLaunchParams
    );

    const [promoStatus, setPromoStatus] = useState(null);
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);

    const checkPromo = useCallback(debounce(async (word) => {
        const normalizedWord = word.trim().toUpperCase();
        if (!normalizedWord || normalizedWord.length < 4) {
            setPromoStatus(null);
            setIsCheckingPromo(false);
            return;
        }
        setIsCheckingPromo(true);
        try {
            const response = await apiGet(`/events/status/${normalizedWord}`);
            setPromoStatus(response);
        } catch (error) {
            console.error("Promo check failed:", error);
            setPromoStatus({ status: 'error' });
        } finally {
            setIsCheckingPromo(false);
        }
    }, 500), [apiGet]);

    useEffect(() => {
        if (activeModal === 'promo-vote-modal') {
             checkPromo(promoWord);
        }
    }, [promoWord, checkPromo, activeModal]);

    const handlePromoWordChange = (e) => {
        setPromoWord(e.target.value);
    };

    const getPromoBottomText = () => {
        if (isCheckingPromo) return <Spinner size='s' style={{alignSelf: 'center'}}/>;
        if (!promoStatus) return null;

        switch (promoStatus.status) {
            case 'active':
                return <span style={{ color: 'var(--vkui--color_text_positive)' }}>Мероприятие найдено и активно!</span>;
            case 'not_started':
                const startTime = new Date(promoStatus.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                return `Голосование еще не началось. Начало: ${startTime}`;
            case 'finished':
                return 'Голосование по этому слову уже завершилось.';
            case 'not_found':
                return <span style={{ color: 'var(--vkui--color_text_negative)' }}>Мероприятие с таким словом не найдено.</span>;
            case 'error':
                return <span style={{ color: 'var(--vkui--color_text_negative)' }}>Ошибка проверки. Попробуйте еще раз.</span>;
            default:
                return null;
        }
    };

    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingApp, setIsLoadingApp] = useState(true);

    const refetchUser = useCallback(async () => {
        try {
            const userData = await apiGet('/users/me');
            setCurrentUser(userData);
        } catch (error) {
            console.error("Failed to refetch user:", error);
        }
    }, [apiGet]);

    useEffect(() => {
        const handleAppEvents = (e) => {
            if (e.detail.type === 'VKWebAppViewRestore') {
                refetchUser();
            }
        };
        bridge.subscribe(handleAppEvents);
        return () => bridge.unsubscribe(handleAppEvents);
    }, [refetchUser]);

    useEffect(() => {
        const initApp = async () => {
             if (!showOnboarding) {
                setIsLoadingApp(true);
                try {
                    const userData = await apiGet('/users/me');
                    setCurrentUser(userData);
                } catch (error) {
                    if (error.message.includes("404") || error.message.includes("not found")) {
                        try {
                            const vkUser = await bridge.send('VKWebAppGetUserInfo');
                            const newUserPayload = {
                                vk_id: vkUser.id,
                                first_name: vkUser.first_name,
                                last_name: vkUser.last_name,
                                photo_url: vkUser.photo_200,
                            };
                            const registeredUser = await apiPost('/users/register', newUserPayload);
                            setCurrentUser(registeredUser);
                        } catch (registrationError) {
                            console.error("Fatal: Failed to register new user:", registrationError);
                        }
                    } else {
                        console.error("Fatal: Failed to fetch current user:", error);
                    }
                } finally {
                    setIsLoadingApp(false);
                }
            } else {
                 setIsLoadingApp(false);
             }
        };
        initApp();
    }, [apiGet, apiPost, showOnboarding, refetchUser]);

    const finishOnboarding = () => {
        localStorage.setItem('onboardingFinished', 'true');
        setShowOnboarding(false);
    };

    const onStoryChange = (e) => {
        const story = e.currentTarget.dataset.story;
        if (story === VIEW_MAIN) routeNavigator.push('/');
        if (story === VIEW_EVENTS) routeNavigator.push('/dashboard');
        if (story === VIEW_TARIFFS) routeNavigator.push('/tariffs');
        if (story === VIEW_PROFILE) routeNavigator.push('/profile');
    };

    const goToVoteByPromo = () => {
        if (promoStatus?.status === 'active') {
            setActiveModal(null);
            routeNavigator.push(`/vote/${promoWord.trim().toUpperCase()}`);
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalCard id="promo-vote-modal" onClose={() => setActiveModal(null)} header="Голосование">
                <FormItem
                    top="Введите промо-слово или наведите камеру на QR-код"
                    bottom={getPromoBottomText()}
                    status={promoStatus?.status === 'not_found' || promoStatus?.status === 'error' ? 'error' : 'default'}
                >
                    <FormField>
                        <Input value={promoWord} onChange={handlePromoWordChange} />
                    </FormField>
                </FormItem>
                <FormItem>
                    <Button
                        size="l"
                        stretched
                        onClick={goToVoteByPromo}
                        disabled={promoStatus?.status !== 'active'}
                    >
                        Проголосовать
                    </Button>
                </FormItem>
            </ModalCard>
        </ModalRoot>
    );

    if (showOnboarding) {
        return <Onboarding onFinish={finishOnboarding} />;
    }

    if (isLoadingApp) {
        return <ScreenSpinner state="loading" />;
    }

    const renderTabbar = () => {
        return (
             <Tabbar>
                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_MAIN} data-story={VIEW_MAIN} label="Рейтинг"><Icon28ArticleOutline /></TabbarItem>
                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_EVENTS} data-story={VIEW_EVENTS} label="Мероприятия"><Icon28CalendarOutline /></TabbarItem>
                <TabbarItem
                    onClick={() => setActiveModal('promo-vote-modal')}
                    style={{ background: 'var(--vkui--color_background_accent)', borderRadius: '12px', color: 'white' }}
                    label="Голосовать"
                >
                    <Icon24CheckCircleFilledBlue />
                </TabbarItem>
                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_TARIFFS} data-story={VIEW_TARIFFS} label="Тарифы"><Icon28MoneyCircleOutline /></TabbarItem>
                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_PROFILE} data-story={VIEW_PROFILE} label="Аккаунт"><Icon28UserCircleOutline /></TabbarItem>
                {currentUser?.is_admin && (
                    <TabbarItem onClick={() => routeNavigator.push('/admin')} selected={activePanel === PANEL_ADMIN} label="Админка">
                        <Icon28CheckShieldOutline />
                    </TabbarItem>
                )}
            </Tabbar>
        );
    };

    return (
        <AppRoot>
            <SplitLayout popout={popout} modal={modal}>
                <SplitCol>
                    <Epic
                        activeStory={activeView}
                        tabbar={renderTabbar()}
                    >
                        <View id={VIEW_MAIN} activePanel={activePanel}>
                            <Home id={PANEL_HOME} user={currentUser} />
                            <Registration id={PANEL_REGISTRATION} user={currentUser} refetchUser={refetchUser} />
                            <Voting id={PANEL_VOTING} setPopout={setPopout} setSnackbar={setSnackbar} user={currentUser} />
                            <ExpertProfile id={PANEL_EXPERT_PROFILE} setPopout={setPopout} setSnackbar={setSnackbar} user={currentUser} />
                            <Admin id={PANEL_ADMIN} setPopout={setPopout} setSnackbar={setSnackbar} />
                        </View>
                        <View id={VIEW_EVENTS} activePanel={activePanel}>
                            <Events id={PANEL_EVENTS} user={currentUser} />
                            <CreateEvent id={PANEL_CREATE_EVENT} setPopout={setPopout} />
                        </View>
                        <View id={VIEW_TARIFFS} activePanel={activePanel}>
                            <Tariffs id={PANEL_TARIFFS} user={currentUser} setPopout={setPopout} setSnackbar={setSnackbar} refetchUser={refetchUser} />
                        </View>
                        <View id={VIEW_PROFILE} activePanel={activePanel}>
                            <Profile id={PANEL_PROFILE} user={currentUser} setCurrentUser={setCurrentUser}/>
                        </View>
                    </Epic>
                </SplitCol>
            </SplitLayout>
            {snackbar}
        </AppRoot>
    );
};