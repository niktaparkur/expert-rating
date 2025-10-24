import { createRoot } from "react-dom/client";
import vkBridge from "@vkontakte/vk-bridge";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppConfig } from "./AppConfig";

vkBridge.send("VKWebAppInit");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const root = createRoot(document.getElementById("root")!);
root.render(
  <QueryClientProvider client={queryClient}>
    <AppConfig />
  </QueryClientProvider>,
);

if (import.meta.env.MODE === "development") {
  import("./eruda");
}
