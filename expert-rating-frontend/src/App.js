import React from 'react';
import { View, SplitLayout, SplitCol } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home, Registration, Admin } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();

  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel={activePanel}>
          <Home id={DEFAULT_VIEW_PANELS.HOME} />
          <Registration id={DEFAULT_VIEW_PANELS.REGISTRATION} />
          <Admin id={DEFAULT_VIEW_PANELS.ADMIN} />
        </View>
      </SplitCol>
    </SplitLayout>
  );
};