import type { Locale } from "@/i18n/config";
import { isLocale } from "@/lib/locale";
import { buildAppUrl } from "@/lib/telegram/bot";

export function buildEventOgCardUrl(eventId: string, locale: string) {
  const safeLocale: Locale = isLocale(locale) ? locale : "en";
  return buildAppUrl(`/api/og/event/${eventId}/card?locale=${safeLocale}`);
}
