import React, { useState } from 'react';
import { AppRoot, Epic, Tabbar, TabbarItem, SplitLayout, SplitCol, View } from '@vkontakte/vkui';
import { useActiveVkuiLocation, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon28UserCircleOutline, Icon28ArticleOutline, Icon28KeyOutline } from '@vkontakte/icons';

import { Home, Registration, Admin, ExpertDashboard, CreateEvent, Voting, ExpertProfile } from './panels/index.jsx';
import {
    VIEW_MAIN, VIEW_DASHBOARD, VIEW_ADMIN,
    PANEL_HOME, PANEL_REGISTRATION, PANEL_DASHBOARD,
    PANEL_CREATE_EVENT, PANEL_ADMIN, PANEL_VOTING, PANEL_EXPERT_PROFILE
} from './routes.jsx';

export const App = () => {
    const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } = useActiveVkuiLocation();
    const routeNavigator = useRouteNavigator();
    const [popout, setPopout] = useState(null); // состояние для popout

    const onStoryChange = (e) => {
        const story = e.currentTarget.dataset.story;
        if (story === VIEW_MAIN) routeNavigator.push('/');
        if (story === VIEW_DASHBOARD) routeNavigator.push('/dashboard');
        if (story === VIEW_ADMIN) routeNavigator.push('/admin');
    };

    return (
        <AppRoot popout={popout}>
            <SplitLayout popout={popout}>
                <SplitCol>
                    <Epic
                        activeStory={activeView}
                        tabbar={
                            <Tabbar>
                                <TabbarItem
                                    onClick={onStoryChange}
                                    selected={activeView === VIEW_MAIN}
                                    data-story={VIEW_MAIN}
                                    label="Рейтинг"
                                >
                                    <Icon28ArticleOutline />
                                </TabbarItem>
                                <TabbarItem
                                    onClick={onStoryChange}
                                    selected={activeView === VIEW_DASHBOARD}
                                    data-story={VIEW_DASHBOARD}
                                    label="Кабинет"
                                >
                                    <Icon28UserCircleOutline />
                                </TabbarItem>
                                <TabbarItem
                                    onClick={onStoryChange}
                                    selected={activeView === VIEW_ADMIN}
                                    data-story={VIEW_ADMIN}
                                    label="Админка"
                                >
                                    <Icon28KeyOutline />
                                </TabbarItem>
                            </Tabbar>
                        }
                    >
                        <View id={VIEW_MAIN} activePanel={activePanel}>
                            <Home id={PANEL_HOME} />
                            <Registration id={PANEL_REGISTRATION} />
                            <Voting id={PANEL_VOTING} />
                            <ExpertProfile id={PANEL_EXPERT_PROFILE} />
                        </View>
                        <View id={VIEW_DASHBOARD} activePanel={activePanel}>
                            <ExpertDashboard id={PANEL_DASHBOARD} />
                            <CreateEvent id={PANEL_CREATE_EVENT} />
                        </View>
                        <View id={VIEW_ADMIN} activePanel={activePanel}>
                            <Admin id={PANEL_ADMIN} setPopout={setPopout} />
                        </View>
                    </Epic>
                </SplitCol>
            </SplitLayout>
        </AppRoot>
    );
};
