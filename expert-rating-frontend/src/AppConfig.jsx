import React, { useState, useEffect } from 'react';
import vkBridge, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useAdaptivity, useInsets } from '@vkontakte/vk-bridge-react';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/vkui.css';
import './components/Onboarding.css';

import { transformVKBridgeAdaptivity } from './utils/index.jsx';
import { router } from './routes.jsx';
import { App } from './App.jsx';

export const AppConfig = () => {
    const [appearance, setAppearance] = useState('light');

    const vkBridgeInsets = useInsets() || undefined;
    const adaptivity = transformVKBridgeAdaptivity(useAdaptivity());
    const { vk_platform } = parseURLSearchParamsForGetLaunchParams(window.location.search);

    useEffect(() => {
        const handleUpdateConfig = (e) => {
            const { type, data } = e.detail;
            if (type === 'VKWebAppUpdateConfig') {
                setAppearance(data.appearance);
            }
        };

        vkBridge.subscribe(handleUpdateConfig);

        async function fetchAppearance() {
            try {
                const config = await vkBridge.send('VKWebAppGetConfig');
                if (config && config.appearance) {
                    setAppearance(config.appearance);
                }
            } catch (error) {
                console.error('Could not fetch VK Bridge config', error);
            }
        }

        fetchAppearance();

        return () => {
            vkBridge.unsubscribe(handleUpdateConfig);
        };
    }, []);

    return (
        <ConfigProvider
            appearance={appearance}
            platform={vk_platform === 'desktop_web' ? 'vkcom' : undefined}
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