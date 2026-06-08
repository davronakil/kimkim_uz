import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { alternateOgLocales, isLocale, ogLocaleTag } from "@/lib/locale";
import { buildAppUrl } from "@/lib/telegram/bot";

export function resolveMetadataLocale(locale: string): Locale {
  return isLocale(locale) ? locale : "en";
}

export function localizedLanguageAlternates(pagePath: string) {
  const pathWithoutLocale = pagePath.replace(/^\/[^/]+/, "");

  return {
    ...Object.fromEntries(locales.map((code) => [code, `/${code}${pathWithoutLocale}`])),
    "x-default": `/en${pathWithoutLocale}`,
  };
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(/\/$/, "");
}

export function buildSitePageMetadata({
  locale,
  pagePath,
  title,
  description,
  ogTitle = title,
  keywords,
}: {
  locale: string;
  pagePath: string;
  title: string;
  description: string;
  ogTitle?: string;
  keywords?: string;
}): Metadata {
  const metadataLocale = resolveMetadataLocale(locale);
  const baseUrl = appBaseUrl();
  const imageUrl = buildAppUrl(`/api/og/site?locale=${metadataLocale}`, baseUrl);
  const image = {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: ogTitle,
  };

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords,
    alternates: {
      canonical: pagePath,
      languages: localizedLanguageAlternates(pagePath),
    },
    openGraph: {
      title: ogTitle,
      description,
      url: pagePath,
      siteName: "KimKim",
      locale: ogLocaleTag(metadataLocale),
      alternateLocale: alternateOgLocales(metadataLocale),
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [imageUrl],
    },
  };
}
