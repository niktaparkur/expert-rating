/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_VK_APP_ID: string;
  readonly VITE_VK_GROUP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
