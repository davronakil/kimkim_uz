import { defaultLocale, locales, localeNames, type Locale } from "@/i18n/config";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Map Telegram or browser language tags to an app locale. */
export function resolveLocaleFromTelegramCode(code?: string | null): Locale {
  const lower = code?.toLowerCase() ?? "";
  if (lower.startsWith("uz")) return "uz";
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("en")) return "en";
  return defaultLocale;
}

/** Prefer a stored app locale; fall back to Telegram tag or English. */
export function resolveUserLocale(
  user?: { language_code?: string | null } | null,
  telegramCode?: string | null,
): Locale {
  const stored = user?.language_code?.toLowerCase();
  if (stored && isLocale(stored)) return stored;
  return resolveLocaleFromTelegramCode(telegramCode);
}

export function intlLocale(locale: Locale): string {
  if (locale === "uz") return "uz-UZ";
  if (locale === "ru") return "ru-RU";
  return "en-US";
}

export function ogLocaleTag(locale: Locale): string {
  if (locale === "uz") return "uz_UZ";
  if (locale === "ru") return "ru_RU";
  return "en_US";
}

export function alternateOgLocales(locale: Locale): string[] {
  return locales.filter((code) => code !== locale).map(ogLocaleTag);
}

export function formatLocaleDateTime(
  date: Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleString(intlLocale(locale), {
    timeZone: "Asia/Tashkent",
    ...options,
  });
}

export function localeLabel(locale: Locale): string {
  return localeNames[locale];
}
