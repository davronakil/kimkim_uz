import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAdminBusinessListings } from "@/lib/db/admin-queries";
import { listPendingBusinessListings } from "@/lib/db/catalog-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import type { BusinessListingStatus } from "@/types";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePlatformAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "all") {
    const status =
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "rejected"
        ? (statusParam as BusinessListingStatus)
        : "all";
    const listings = await listAdminBusinessListings(status);
    return NextResponse.json({ listings });
  }

  const pending = await listPendingBusinessListings();
  return NextResponse.json({ pending });
}
