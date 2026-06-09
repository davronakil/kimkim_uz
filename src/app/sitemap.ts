import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/config";
import { listPublicEventsForSitemap } from "@/lib/db/queries";
import { absoluteUrl, appBaseUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appBaseUrl();
  const now = new Date();

  const homeEntries = locales.map((locale) => ({
    url: absoluteUrl(`/${locale}`, baseUrl),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: locale === defaultLocale ? 1 : 0.9,
    alternates: {
      languages: {
        ...Object.fromEntries(locales.map((code) => [code, absoluteUrl(`/${code}`, baseUrl)])),
        "x-default": absoluteUrl(`/${defaultLocale}`, baseUrl),
      },
    },
  }));

  const discoverEntries = locales.map((locale) => ({
    url: absoluteUrl(`/${locale}/discover`, baseUrl),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
    alternates: {
      languages: {
        ...Object.fromEntries(
          locales.map((code) => [code, absoluteUrl(`/${code}/discover`, baseUrl)]),
        ),
        "x-default": absoluteUrl(`/${defaultLocale}/discover`, baseUrl),
      },
    },
  }));

  const catalogEntries = locales.map((locale) => ({
    url: absoluteUrl(`/${locale}/catalog`, baseUrl),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
    alternates: {
      languages: {
        ...Object.fromEntries(
          locales.map((code) => [code, absoluteUrl(`/${code}/catalog`, baseUrl)]),
        ),
        "x-default": absoluteUrl(`/${defaultLocale}/catalog`, baseUrl),
      },
    },
  }));

  let publicEvents: Awaited<ReturnType<typeof listPublicEventsForSitemap>> = [];

  try {
    publicEvents = await listPublicEventsForSitemap();
  } catch {
    return [...homeEntries, ...discoverEntries, ...catalogEntries];
  }

  const eventEntries = publicEvents.map((event) => {
    const pathWithoutLocale = `/events/${event.id}`;
    const lastModified = event.updated_at ? new Date(event.updated_at) : new Date(event.starts_at);

    return {
      url: absoluteUrl(`/${defaultLocale}${pathWithoutLocale}`, baseUrl),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          ...Object.fromEntries(
            locales.map((code) => [code, absoluteUrl(`/${code}${pathWithoutLocale}`, baseUrl)]),
          ),
          "x-default": absoluteUrl(`/${defaultLocale}${pathWithoutLocale}`, baseUrl),
        },
      },
    };
  });

  return [...homeEntries, ...discoverEntries, ...catalogEntries, ...eventEntries];
}
