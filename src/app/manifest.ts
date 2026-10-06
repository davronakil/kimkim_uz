import type { MetadataRoute } from "next";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

function asLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  return (locales as readonly string[]).includes(value) ? (value as Locale) : null;
}

function localeFromReferer(referer: string | null): Locale | null {
  if (!referer) return null;
  try {
    return asLocale(new URL(referer).pathname.split("/")[1]);
  } catch {
    return null;
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale =
    asLocale(cookieStore.get(LOCALE_COOKIE)?.value) ??
    localeFromReferer(headerStore.get("referer")) ??
    defaultLocale;

  return {
    id: "/",
    name: "KimKim — Event planning",
    short_name: "KimKim",
    description:
      "Plan weddings, gap circles, soccer, hunting trips, fishing, camping, and any gathering. Split expenses, keep shared event photos, stay connected.",
    start_url: `/${locale}/events`,
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
