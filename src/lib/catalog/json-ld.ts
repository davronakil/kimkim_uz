import type { BusinessListing } from "@/types";
import { absoluteUrl, appBaseUrl } from "@/lib/seo";

export function buildBusinessListingJsonLd({
  listing,
  locale,
  categoryLabel,
  vouchCount,
}: {
  listing: BusinessListing;
  locale: string;
  categoryLabel: string;
  vouchCount: number;
}) {
  const baseUrl = appBaseUrl();
  const url = absoluteUrl(`/${locale}/catalog/${listing.id}`, baseUrl);
  const image = listing.cover_image_key
    ? absoluteUrl(`/api/media/${listing.cover_image_key}`, baseUrl)
    : undefined;
  const sameAs = [
    listing.website_url,
    listing.telegram_username
      ? `https://t.me/${listing.telegram_username.replace(/^@/, "")}`
      : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name: listing.name,
    description: listing.description?.trim() || undefined,
    url,
    image,
    telephone: listing.phone ?? undefined,
    category: categoryLabel,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    address: listing.location_address
      ? {
          "@type": "PostalAddress",
          streetAddress: listing.location_address,
        }
      : undefined,
    geo:
      listing.location_lat != null && listing.location_lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: listing.location_lat,
            longitude: listing.location_lng,
          }
        : undefined,
    location: listing.location_name
      ? {
          "@type": "Place",
          name: listing.location_name,
        }
      : undefined,
    subjectOf:
      vouchCount > 0
        ? {
            "@type": "CreativeWork",
            name: `${vouchCount} KimKim vouches`,
          }
        : undefined,
  };
}
