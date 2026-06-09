import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { getBusinessListingVouchCount, getBusinessListingWithRepresentative } from "@/lib/db/catalog-queries";
import { isLocale } from "@/lib/locale";
import { CatalogCardImage } from "@/lib/og/catalog-card-image";

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request, context: RouteContext) {
  const { listingId } = await context.params;
  const localeParam = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = isLocale(localeParam) ? localeParam : "en";

  const listing = await getBusinessListingWithRepresentative(listingId);
  if (!listing || listing.status !== "approved") {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const vouchCount = await getBusinessListingVouchCount(listingId);

  return new ImageResponse(
    <CatalogCardImage listing={listing} locale={locale} vouchCount={vouchCount} />,
    {
      width: 1200,
      height: 630,
      headers: {
        ...cacheHeaders,
      },
    },
  );
}
