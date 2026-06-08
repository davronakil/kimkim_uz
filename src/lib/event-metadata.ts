import type { Metadata } from "next";
import { alternateOgLocales, intlLocale, ogLocaleTag } from "@/lib/locale";
import { buildEventOgCardUrl } from "@/lib/og/event-card-url";
import { localizedLanguageAlternates, resolveMetadataLocale } from "@/lib/page-metadata";
import { isPublicEvent } from "@/lib/events/visibility";
import { buildAppUrl } from "@/lib/telegram/bot";
import { resolveServerGoogleMapsApiKey } from "@/lib/google-static-map";
import type { Event } from "@/types";

function formatEventOgDescription(event: Event, locale: string) {
  const parts = [event.title];
  if (event.location_name) parts.push(event.location_name);

  const dateLocale = intlLocale(resolveMetadataLocale(locale));
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

async function resolveEventOgImage(event: Event, locale: string): Promise<string> {
  if (event.cover_image_key) {
    return buildAppUrl(`/api/media/${event.cover_image_key}`);
  }

  if (event.location_lat != null && event.location_lng != null) {
    const apiKey = await resolveServerGoogleMapsApiKey();
    if (apiKey) {
      return buildAppUrl(`/api/og/event/${event.id}/map`);
    }
  }

  const cardLocale = resolveMetadataLocale(locale);
  return buildEventOgCardUrl(event.id, cardLocale);
}

type EventMetadataOptions = {
  indexable?: boolean;
};

async function buildEventMetadata(
  event: Event,
  locale: string,
  pagePath: string,
  options: EventMetadataOptions = {},
): Promise<Metadata> {
  const metadataLocale = resolveMetadataLocale(locale);
  const description = formatEventOgDescription(event, metadataLocale);
  const imageUrl = await resolveEventOgImage(event, metadataLocale);
  const ogLocale = ogLocaleTag(metadataLocale);
  const indexable = options.indexable ?? false;

  const openGraphImages = [
    {
      url: imageUrl,
      width: 1200,
      height: 630,
      alt: event.cover_image_key
        ? event.title
        : event.location_name
          ? `${event.title} — ${event.location_name}`
          : event.title,
    },
  ];

  return {
    title: event.title,
    description,
    robots: {
      index: indexable,
      follow: true,
    },
    alternates: {
      canonical: pagePath,
      languages: localizedLanguageAlternates(pagePath),
    },
    openGraph: {
      title: event.title,
      description,
      url: pagePath,
      siteName: "KimKim",
      locale: ogLocale,
      alternateLocale: alternateOgLocales(metadataLocale),
      type: "website",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [imageUrl],
    },
  };
}

export async function buildEventDetailMetadata(
  event: Event,
  locale: string,
  pagePath: string,
): Promise<Metadata> {
  return buildEventMetadata(event, locale, pagePath, {
    indexable: isPublicEvent(event.visibility),
  });
}

export async function buildEventJoinMetadata(
  event: Event,
  locale: string,
  pagePath: string,
): Promise<Metadata> {
  return buildEventMetadata(event, locale, pagePath, { indexable: false });
}

/** @deprecated Use buildEventDetailMetadata or buildEventJoinMetadata */
export async function buildEventShareMetadata(
  event: Event,
  locale: string,
  pagePath: string,
): Promise<Metadata> {
  return buildEventJoinMetadata(event, locale, pagePath);
}
