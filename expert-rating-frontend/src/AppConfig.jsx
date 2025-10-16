import React from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import {
    useAdaptivity,
    useInsets,
    useAppearance as useColorScheme
} from '@vkontakte/vk-bridge-react';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/vkui.css';

import { transformVKBridgeAdaptivity } from './utils/index.jsx';
import { router } from './routes.jsx';
import { App } from './App.jsx';

export const AppConfig = () => {
    const colorScheme = useColorScheme() || 'light';


    const vkBridgeInsets = useInsets() || undefined;
    const adaptivity = transformVKBridgeAdaptivity(useAdaptivity());

    return (
        <ConfigProvider
            colorScheme={colorScheme}
            isWebView={vkBridge.isWebView()}
        >
            <AdaptivityProvider {...adaptivity}>
                <AppRoot mode="full" safeAreaInsets={vkBridgeInsets}>
                    <RouterProvider router={router}>
                        <App />
                    </RouterProvider>
                </AppRoot>
            </AdaptivityProvider>
        </ConfigProvider>
    );
};