export const locales = ["en", "uz", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  uz: "O'zbek",
  ru: "Русский",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  uz: "🇺🇿",
  ru: "🇷🇺",
};

export const localeShort: Record<Locale, string> = {
  en: "EN",
  uz: "UZ",
  ru: "RU",
};
