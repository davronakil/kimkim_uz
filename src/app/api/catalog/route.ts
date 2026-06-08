import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createBusinessListing,
  getBusinessListingSlotSummaryForUser,
  listApprovedBusinessListings,
} from "@/lib/db/catalog-queries";
import { parseBusinessListingFormData } from "@/lib/catalog/form";
import { getMediaBucket } from "@/lib/cloudflare";
import { isSuperadmin } from "@/lib/platform/admin";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const listings = await listApprovedBusinessListings(category || undefined);
  return NextResponse.json({ listings });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superadmin = await isSuperadmin(user);
  if (!superadmin) {
    const slots = await getBusinessListingSlotSummaryForUser(user);
    if (slots.remaining <= 0) {
      return NextResponse.json({ error: "No listing slots available" }, { status: 403 });
    }
  }

  const formData = await request.formData();
  const parsed = parseBusinessListingFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing data" }, { status: 400 });
  }

  const listingId = await createBusinessListing({
    representativeUserId: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    phone: parsed.data.phone ?? null,
    telegramUsername: parsed.data.telegram_username ?? user.username,
    websiteUrl: parsed.data.website_url ?? null,
    locationName: parsed.data.location_name ?? null,
    locationAddress: parsed.data.location_address ?? null,
    locationLat: parsed.data.location_lat ?? null,
    locationLng: parsed.data.location_lng ?? null,
    approvedBy: superadmin ? user.id : undefined,
  });

  const cover = formData.get("cover_image");
  if (cover instanceof File && cover.size > 0) {
    const media = await getMediaBucket();
    const coverImageKey = `catalog/${listingId}/${cover.name}`;
    await media.put(coverImageKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });

    const { updateBusinessListing } = await import("@/lib/db/catalog-queries");
    await updateBusinessListing(listingId, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      phone: parsed.data.phone ?? null,
      telegramUsername: parsed.data.telegram_username ?? user.username ?? null,
      websiteUrl: parsed.data.website_url ?? null,
      locationName: parsed.data.location_name ?? null,
      locationAddress: parsed.data.location_address ?? null,
      locationLat: parsed.data.location_lat ?? null,
      locationLng: parsed.data.location_lng ?? null,
      coverImageKey,
    });
  }

  return NextResponse.json({ id: listingId, published: superadmin });
}
