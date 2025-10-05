// src/App.jsx
import React, { useState } from 'react';
import { Epic, Tabbar, TabbarItem, SplitLayout, SplitCol, View, AppRoot, ModalRoot, ModalCard, FormItem, FormField, Input, Button } from '@vkontakte/vkui';
import { useActiveVkuiLocation, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon28ArticleOutline, Icon28CalendarOutline, Icon28MoneyCircleOutline, Icon28UserCircleOutline, Icon24CheckCircleFilledBlue } from '@vkontakte/icons';

import { Home, Registration, Admin, ExpertDashboard, CreateEvent, Voting, ExpertProfile, Tariffs, Profile } from './panels';
import {
    VIEW_MAIN, VIEW_DASHBOARD, VIEW_TARIFFS, VIEW_PROFILE,
    PANEL_HOME, PANEL_REGISTRATION, PANEL_DASHBOARD, PANEL_CREATE_EVENT,
    PANEL_ADMIN, PANEL_VOTING, PANEL_EXPERT_PROFILE,
    PANEL_TARIFFS, PANEL_PROFILE
} from './routes';

export const App = () => {
    const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } = useActiveVkuiLocation();
    const routeNavigator = useRouteNavigator();
    const [popout, setPopout] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [promoWord, setPromoWord] = useState('');

    const onStoryChange = (e) => {
        const story = e.currentTarget.dataset.story;
        if (story === VIEW_MAIN) routeNavigator.push('/');
        if (story === VIEW_DASHBOARD) routeNavigator.push('/dashboard');
        if (story === VIEW_TARIFFS) routeNavigator.push('/tariffs');
        if (story === VIEW_PROFILE) routeNavigator.push('/profile');
    };

    const goToVoteByPromo = () => {
        if (promoWord.trim()) {
            setActiveModal(null);
            routeNavigator.push(`/vote/${promoWord.trim().toUpperCase()}`);
        }
    };

    const modal = (
        <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalCard id="promo-vote-modal" onClose={() => setActiveModal(null)} header="Голосование по промо-слову">
                <FormItem top="Введите промо-слово мероприятия">
                    <FormField><Input value={promoWord} onChange={(e) => setPromoWord(e.target.value)} /></FormField>
                </FormItem>
                <FormItem><Button size="l" stretched onClick={goToVoteByPromo}>Проголосовать</Button></FormItem>
            </ModalCard>
        </ModalRoot>
    );

    return (
        <AppRoot>
            <SplitLayout popout={popout} modal={modal}>
                <SplitCol>
                    <Epic
                        activeStory={activeView}
                        tabbar={
                            <Tabbar>
                                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_MAIN} data-story={VIEW_MAIN} label="Рейтинг"><Icon28ArticleOutline /></TabbarItem>
                                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_DASHBOARD} data-story={VIEW_DASHBOARD} label="Мероприятия"><Icon28CalendarOutline /></TabbarItem>
                                <TabbarItem
                                    onClick={() => setActiveModal('promo-vote-modal')}
                                    style={{ background: 'var(--vkui--color_background_accent)', borderRadius: '12px', marginBottom: "4px", color: 'white' }}
                                    label="Голосовать"
                                >
                                    <Icon24CheckCircleFilledBlue/>
                                </TabbarItem>
                                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_TARIFFS} data-story={VIEW_TARIFFS} label="Тарифы"><Icon28MoneyCircleOutline /></TabbarItem>
                                <TabbarItem onClick={onStoryChange} selected={activeView === VIEW_PROFILE} data-story={VIEW_PROFILE} label="Аккаунт"><Icon28UserCircleOutline /></TabbarItem>
                            </Tabbar>
                        }
                    >
                        <View id={VIEW_MAIN} activePanel={activePanel}><Home id={PANEL_HOME} setPopout={setPopout} /><Registration id={PANEL_REGISTRATION} setPopout={setPopout} /><Voting id={PANEL_VOTING} setPopout={setPopout} /><ExpertProfile id={PANEL_EXPERT_PROFILE} setPopout={setPopout} /><Admin id={PANEL_ADMIN} setPopout={setPopout} /></View>
                        <View id={VIEW_DASHBOARD} activePanel={activePanel}><ExpertDashboard id={PANEL_DASHBOARD} setPopout={setPopout} /><CreateEvent id={PANEL_CREATE_EVENT} setPopout={setPopout} /></View>
                        <View id={VIEW_TARIFFS} activePanel={activePanel}><Tariffs id={PANEL_TARIFFS} setPopout={setPopout} /></View>
                        <View id={VIEW_PROFILE} activePanel={activePanel}><Profile id={PANEL_PROFILE} setPopout={setPopout} /></View>
                    </Epic>
                </SplitCol>
            </SplitLayout>
        </AppRoot>
    );
};