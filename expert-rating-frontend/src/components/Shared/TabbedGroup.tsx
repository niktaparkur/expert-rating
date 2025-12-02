import React from "react";
import {
  Group,
  Separator,
  Tabs,
  TabsItem,
  SegmentedControl,
  Div,
} from "@vkontakte/vkui";

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

  // Если вкладок мало (<= 2), используем SegmentedControl для красоты и растягивания
  const useSegmentedControl = tabs.length <= 2;

  return (
    <Group>
      {tabs.length > 1 && (
        <>
          {useSegmentedControl ? (
            <Div style={{ paddingTop: 12, paddingBottom: 12 }}>
              <SegmentedControl
                size="l"
                value={activeTab}
                onChange={(value) => onTabChange(String(value))}
                options={tabs.map((tab) => ({
                  label: tab.title,
                  value: tab.id,
                }))}
              />
            </Div>
          ) : (
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
          {/* Разделитель нужен только для Tabs, у SegmentedControl свои отступы */}
          {!useSegmentedControl && <Separator />}
        </>
      )}

      <div
        style={{
          paddingTop: tabs.length > 1 && !useSegmentedControl ? "12px" : "0",
        }}
      >
        {activeContent}
      </div>
    </Group>
  );
};
