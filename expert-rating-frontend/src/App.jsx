import React, { useState, useEffect, useCallback } from 'react';
import {
    Epic, Tabbar, TabbarItem, SplitLayout, SplitCol, View, AppRoot,
    ModalRoot, ModalCard, FormItem, FormField, Input, Button, ScreenSpinner, Tooltip, Spinner, Snackbar
} from '@vkontakte/vkui';
import {
    Icon28ArticleOutline, Icon28CalendarOutline, Icon28MoneyCircleOutline,
    Icon28UserCircleOutline, Icon24CheckCircleFilledBlue, Icon28CheckShieldOutline, Icon16Done
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
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('onboardingFinished'));

    const [promoStatus, setPromoStatus] = useState({ status: 'default', text: '' }); // default, checking, taken, available
    const [snackbar, setSnackbar] = useState(null);


    // eslint-disable-next-line
    const checkPromo = useCallback(debounce(async (word) => {
        const normalizedWord = word.trim().toUpperCase();
        if (!normalizedWord || normalizedWord.length < 4) {
            setPromoStatus({ status: 'default', text: '' });
            return;
        }
        setPromoStatus({ status: 'checking', text: 'Проверка...' });
        try {
            const response = await apiGet(`/events/check-promo/${normalizedWord}`);
            if (response.is_taken) {
                setPromoStatus({ status: 'available', text: 'Мероприятие найдено!' });
            } else {
                setPromoStatus({ status: 'taken', text: 'Мероприятие с таким словом не найдено' });
            }
        } catch (error) {
            console.error("Promo check failed:", error);
            setPromoStatus({ status: 'default', text: 'Ошибка проверки' });
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
        if (promoStatus.status === 'checking') return <Spinner size='s' style={{alignSelf: 'center'}}/>;
        if (promoStatus.text) {
            const color = promoStatus.status === 'taken' ? 'var(--vkui--color_text_negative)' : 'var(--vkui--color_text_positive)';
            return <span style={{ color }}>{promoStatus.text}</span>;
        }
        return null;
    };

    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingApp, setIsLoadingApp] = useState(true);

    useEffect(() => {
        const initApp = async () => {
            setIsLoadingApp(true);
            try {
                const userData = await apiGet('/users/me');
                setCurrentUser(userData);
            } catch (error) {
                if (error.message.includes("404") || error.message.includes("not found")) {
                    console.log("User not found in DB, starting registration...");
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
        };

        if (!showOnboarding) {
            initApp();
        } else {
            setIsLoadingApp(false);
        }
    }, [apiGet, apiPost, showOnboarding]);

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
        if (promoWord.trim() && promoStatus.status === 'available') {
            setActiveModal(null);
            routeNavigator.push(`/vote/${promoWord.trim().toUpperCase()}`);
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalCard id="promo-vote-modal" onClose={() => setActiveModal(null)} header="Голосование по промо-слову">
                <FormItem
                    top="Введите промо-слово мероприятия"
                    bottom={getPromoBottomText()}
                    status={promoStatus.status === 'taken' ? 'error' : 'default'}
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
                        disabled={promoStatus.status !== 'available'}
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
                     <Tooltip description="Панель администратора" placement="top">
                        <TabbarItem onClick={() => routeNavigator.push('/admin')} selected={activePanel === PANEL_ADMIN}>
                            <Icon28CheckShieldOutline />
                        </TabbarItem>
                    </Tooltip>
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
                            <Registration id={PANEL_REGISTRATION} />
                            <Voting id={PANEL_VOTING} setPopout={setPopout} />
                            <ExpertProfile id={PANEL_EXPERT_PROFILE} setPopout={setPopout} />
                            <Admin id={PANEL_ADMIN} setPopout={setPopout} />
                        </View>
                        <View id={VIEW_EVENTS} activePanel={activePanel}>
                            <Events id={PANEL_EVENTS} user={currentUser} />
                            <CreateEvent id={PANEL_CREATE_EVENT} setPopout={setPopout} />
                        </View>
                        <View id={VIEW_TARIFFS} activePanel={activePanel}>
                            <Tariffs id={PANEL_TARIFFS} user={currentUser} setPopout={setPopout} setSnackbar={setSnackbar}/>
                        </View>
                        <View id={VIEW_PROFILE} activePanel={activePanel}>
                            <Profile id={PANEL_PROFILE} user={currentUser}/>
                        </View>
                    </Epic>
                </SplitCol>
            </SplitLayout>
            {snackbar}
        </AppRoot>
    );
};