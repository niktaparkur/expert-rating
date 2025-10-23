// expert-rating-frontend/src/components/TabbedGroup.tsx

import React from "react";
import { Group, Separator, Tabs, TabsItem } from "@vkontakte/vkui";

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface TabbedGroupProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabbedGroup: React.FC<TabbedGroupProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  if (tabs.length === 0) {
    return null;
  }

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <Group>
      {tabs.length > 1 && (
        <Tabs>
          {tabs.map((tab) => (
            <TabsItem
              key={tab.id}
              selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.title}
            </TabsItem>
          ))}
        </Tabs>
      )}
      <Separator />
      <div style={{ paddingTop: tabs.length > 1 ? "12px" : "0" }}>
        {activeContent}
      </div>
    </Group>
  );
};
