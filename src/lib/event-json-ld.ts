import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/locale";
import { buildEventOgCardUrl } from "@/lib/og/event-card-url";
import { resolveMetadataLocale } from "@/lib/page-metadata";
import { absoluteUrl, appBaseUrl } from "@/lib/seo";
import { buildAppUrl } from "@/lib/telegram/bot";
import { resolveServerGoogleMapsApiKey } from "@/lib/google-static-map";
import type { Event } from "@/types";

async function resolveEventImage(event: Event, locale: Locale) {
  if (event.cover_image_key) {
    return buildAppUrl(`/api/media/${event.cover_image_key}`);
  }

  if (event.location_lat != null && event.location_lng != null) {
    const apiKey = await resolveServerGoogleMapsApiKey();
    if (apiKey) {
      return buildAppUrl(`/api/og/event/${event.id}/map`);
    }
  }

  return buildEventOgCardUrl(event.id, locale);
}

export async function buildEventJsonLd(event: Event, locale: string) {
  const metadataLocale = resolveMetadataLocale(locale);
  const pagePath = `/${metadataLocale}/events/${event.id}`;
  const pageUrl = absoluteUrl(pagePath, appBaseUrl());
  const imageUrl = await resolveEventImage(event, metadataLocale);
  const dateLocale = intlLocale(metadataLocale);

  const location =
    event.location_name || event.location_address
      ? {
          "@type": "Place",
          name: event.location_name ?? event.location_address ?? undefined,
          address: event.location_address ?? undefined,
          ...(event.location_lat != null && event.location_lng != null
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: event.location_lat,
                  longitude: event.location_lng,
                },
              }
            : {}),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description?.trim() || undefined,
    startDate: new Date(event.starts_at).toISOString(),
    endDate: event.ends_at ? new Date(event.ends_at).toISOString() : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    inLanguage: dateLocale,
    image: [imageUrl],
    url: pageUrl,
    location,
    organizer: {
      "@type": "Organization",
      name: "KimKim",
      url: absoluteUrl(`/${metadataLocale}`, appBaseUrl()),
    },
  };
}
