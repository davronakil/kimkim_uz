import type { Metadata } from "next";
import { buildAppUrl } from "@/lib/telegram/bot";
import { resolveServerGoogleMapsApiKey } from "@/lib/google-static-map";
import type { Event } from "@/types";

function formatEventOgDescription(event: Event, locale: string) {
  const parts = [event.title];
  if (event.location_name) parts.push(event.location_name);

  const dateLocale = locale === "uz" ? "uz-UZ" : "en-US";
  const formattedDate = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(event.starts_at));
  parts.push(formattedDate);

  if (event.description) {
    const snippet = event.description.trim().slice(0, 140);
    if (snippet) parts.push(snippet);
  }

  return parts.join(" · ");
}

async function resolveEventOgImage(event: Event): Promise<string | undefined> {
  if (event.cover_image_key) {
    return buildAppUrl(`/api/media/${event.cover_image_key}`);
  }

  if (event.location_lat != null && event.location_lng != null) {
    const apiKey = await resolveServerGoogleMapsApiKey();
    if (apiKey) {
      return buildAppUrl(`/api/og/event/${event.id}/map`);
    }
  }

  return undefined;
}

export async function buildEventShareMetadata(
  event: Event,
  locale: string,
  pagePath: string,
): Promise<Metadata> {
  const description = formatEventOgDescription(event, locale);
  const imageUrl = await resolveEventOgImage(event);
  const ogLocale = locale === "uz" ? "uz_UZ" : "en_US";

  const openGraphImages = imageUrl
    ? [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.cover_image_key
            ? event.title
            : (event.location_name ?? event.title),
        },
      ]
    : undefined;

  return {
    title: event.title,
    description,
    alternates: {
      canonical: pagePath,
    },
    openGraph: {
      title: event.title,
      description,
      url: pagePath,
      siteName: "KimKim",
      locale: ogLocale,
      alternateLocale: locale === "uz" ? ["en_US"] : ["uz_UZ"],
      type: "website",
      images: openGraphImages,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
