import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getBusinessListingById, reviewBusinessListing } from "@/lib/db/catalog-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePlatformAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const listing = await getBusinessListingById(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await reviewBusinessListing({
    id,
    status: parsed.data.action === "approve" ? "approved" : "rejected",
    reviewerId: user.id,
    rejectionReason: parsed.data.rejectionReason,
  });

  return NextResponse.json({ ok: true });
}
