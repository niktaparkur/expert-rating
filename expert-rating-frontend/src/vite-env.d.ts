/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_VK_APP_ID: string;
  readonly VITE_VK_GROUP_ID: string;

  // Юридические документы
  readonly VITE_LEGAL_OFFER_URL: string;
  readonly VITE_LEGAL_USER_AGREEMENT_URL: string;
  readonly VITE_LEGAL_PRIVACY_URL: string;
  readonly VITE_LEGAL_MAILING_CONSENT_URL: string; // Новая переменная
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
