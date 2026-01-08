import React from "react";
import vkBridge from "@vkontakte/vk-bridge";
import {
  useAdaptivity,
  useInsets,
  useAppearance as useColorScheme,
} from "@vkontakte/vk-bridge-react";
import { AdaptivityProvider, ConfigProvider, AppRoot } from "@vkontakte/vkui";
import { RouterProvider } from "@vkontakte/vk-mini-apps-router";
import "@vkontakte/vkui/dist/vkui.css";

import { transformVKBridgeAdaptivity } from "./utils";
import { router } from "./routes";
import { App } from "./App";

export const AppConfig = () => {
  const colorScheme = useColorScheme() || "light";
  const vkBridgeInsets = useInsets() || undefined;
  const vkBridgeAdaptivity = useAdaptivity();

  const adaptivity = React.useMemo(
    () => transformVKBridgeAdaptivity(vkBridgeAdaptivity),
    [vkBridgeAdaptivity],
  );

  const currentUrl = new URL(window.location.href);
  const vkPlatform = currentUrl.searchParams.get("vk_platform");

  let platform = "android";
  if (vkPlatform === "desktop_web") {
    platform = "vkcom";
  } else if (
    vkPlatform === "mobile_iphone" ||
    vkPlatform === "iphone_external"
  ) {
    platform = "ios";
  } else if (
    vkPlatform === "mobile_android" ||
    vkPlatform === "android_external"
  ) {
    platform = "android";
  }

  return (
    <ConfigProvider
      colorScheme={colorScheme}
      isWebView={vkBridge.isWebView()}
      platform={platform as "android" | "ios" | "vkcom"}
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
