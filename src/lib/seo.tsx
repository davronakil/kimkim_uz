import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/locale";

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(/\/$/, "");
}

export function absoluteUrl(path: string, baseUrl = appBaseUrl()) {
  return new URL(path, `${baseUrl}/`).toString();
}

export function localeLanguageTag(locale: Locale) {
  return intlLocale(locale);
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
