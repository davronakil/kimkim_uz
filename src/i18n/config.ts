export const locales = ["en", "uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  uz: "O'zbek",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  uz: "🇺🇿",
};

export const localeShort: Record<Locale, string> = {
  en: "EN",
  uz: "UZ",
};
