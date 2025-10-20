import React from 'react';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import { router } from '../src/routes.jsx';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => {
      return (
        <RouterProvider router={router}>
          <ConfigProvider appearance="light">
            <AdaptivityProvider>
              <AppRoot mode="full">
                <div style={{ padding: '20px', backgroundColor: 'var(--vkui--color_background_content)' }}>
                  <Story />
                </div>
              </AppRoot>
            </AdaptivityProvider>
          </ConfigProvider>
        </RouterProvider>
      );
    },
  ],
};

export default preview;