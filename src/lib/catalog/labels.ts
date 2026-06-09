import enMessages from "@/../messages/en.json";
import ruMessages from "@/../messages/ru.json";
import uzMessages from "@/../messages/uz.json";
import type { Locale } from "@/i18n/config";
import { normalizeStoredCategory } from "@/lib/catalog/categories";

const catalogMessages = {
  en: enMessages.catalog.categories,
  uz: uzMessages.catalog.categories,
  ru: ruMessages.catalog.categories,
};

export function catalogCategoryLabel(locale: Locale, category: string) {
  const normalized = normalizeStoredCategory(category);
  return catalogMessages[locale][normalized] ?? catalogMessages.en.other;
}
