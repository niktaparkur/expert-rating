import { useState, useEffect } from 'react';
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
    const handleThemeChange = (event) => {
      if (event.detail && event.detail.type === 'VKWebAppUpdateConfig') {
        const scheme = event.detail.data.scheme;
        if (scheme === 'space_gray' || scheme === 'vkcom_dark') {
          setAppearance('dark');
        } else {
          setAppearance('light');
        }
      }
    };

    vkBridge.subscribe(handleThemeChange);

    vkBridge.send('VKWebAppGetConfig').then(config => {
        if (config.appearance === 'dark') {
            setAppearance('dark');
        }
    });

    return () => {
      vkBridge.unsubscribe(handleThemeChange);
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