export const LEGAL_DOCUMENTS = {
  offer: {
    title: "Публичная оферта",
    url: import.meta.env.VITE_LEGAL_OFFER_URL || "https://vk.com/dev/terms",
  },
  user_agreement: {
    title: "Пользовательское соглашение",
    url:
      import.meta.env.VITE_LEGAL_USER_AGREEMENT_URL ||
      "https://vk.com/dev/terms",
  },
  privacy: {
    title: "Политика Конфиденциальности",
    url: import.meta.env.VITE_LEGAL_PRIVACY_URL || "https://vk.com/privacy",
  },
  mailing_consent: {
    title: "Согласие на рассылку",
    url:
      import.meta.env.VITE_LEGAL_MAILING_CONSENT_URL ||
      "https://vk.com/dev/terms",
  },
};
