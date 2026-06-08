import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl, appBaseUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = appBaseUrl();
  const now = new Date();

  return locales.map((locale) => ({
    url: absoluteUrl(`/${locale}`, baseUrl),
    lastModified: now,
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.9,
    alternates: {
      languages: {
        ...Object.fromEntries(locales.map((code) => [code, absoluteUrl(`/${code}`, baseUrl)])),
        "x-default": absoluteUrl("/en", baseUrl),
      },
    },
  }));
}
