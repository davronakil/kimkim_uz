import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { alternateOgLocales, isLocale, ogLocaleTag } from "@/lib/locale";
import { appBaseUrl } from "@/lib/seo";
import { buildAppUrl } from "@/lib/telegram/bot";

export function resolveMetadataLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export function localizedLanguageAlternates(pagePath: string) {
  const pathWithoutLocale = pagePath.replace(/^\/[^/]+/, "");

  return {
    ...Object.fromEntries(locales.map((code) => [code, `/${code}${pathWithoutLocale}`])),
    "x-default": `/${defaultLocale}${pathWithoutLocale}`,
  };
}

export function buildSitePageMetadata({
  locale,
  pagePath,
  title,
  description,
  ogTitle = title,
  keywords,
  robots,
}: {
  locale: string;
  pagePath: string;
  title: string;
  description: string;
  ogTitle?: string;
  keywords?: string;
  robots?: Metadata["robots"];
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
    robots,
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
