import React from 'react';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

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
        <ConfigProvider appearance="light">
          <AdaptivityProvider>
            <AppRoot mode="full">
              <div style={{ padding: '20px', backgroundColor: 'var(--vkui--color_background_content)' }}>
                <Story />
              </div>
            </AppRoot>
          </AdaptivityProvider>
        </ConfigProvider>
      );
    },
  ],
};

export default preview;