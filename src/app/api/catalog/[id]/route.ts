import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getMediaBucket } from "@/lib/cloudflare";
import {
  getBusinessListingById,
  getBusinessListingWithRepresentative,
  updateBusinessListing,
} from "@/lib/db/catalog-queries";
import { parseBusinessListingFormData } from "@/lib/catalog/form";
import { isPlatformAdmin, isSuperadmin } from "@/lib/platform/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const listing = await getBusinessListingWithRepresentative(id);

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (listing.status !== "approved") {
    const user = await getCurrentUser();
    const canView =
      user &&
      (listing.representative_user_id === user.id ||
        (await isPlatformAdmin(user)));

    if (!canView) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ listing });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const listing = await getBusinessListingById(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (listing.representative_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const superadmin = await isSuperadmin(user);

  const formData = await request.formData();
  const parsed = parseBusinessListingFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing data" }, { status: 400 });
  }

  let coverImageKey: string | null | undefined;
  const removeCover = formData.get("remove_cover") === "true";
  const cover = formData.get("cover_image");

  if (removeCover) {
    coverImageKey = null;
  } else if (cover instanceof File && cover.size > 0) {
    const media = await getMediaBucket();
    coverImageKey = `catalog/${id}/${Date.now()}-${cover.name}`;
    await media.put(coverImageKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });
  }

  await updateBusinessListing(id, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    phone: parsed.data.phone ?? null,
    telegramUsername: parsed.data.telegram_username ?? null,
    websiteUrl: parsed.data.website_url ?? null,
    locationName: parsed.data.location_name ?? null,
    locationAddress: parsed.data.location_address ?? null,
    locationLat: parsed.data.location_lat ?? null,
    locationLng: parsed.data.location_lng ?? null,
    coverImageKey,
    resetForReview:
      !superadmin && (listing.status === "approved" || listing.status === "rejected"),
  });

  return NextResponse.json({ ok: true });
}
