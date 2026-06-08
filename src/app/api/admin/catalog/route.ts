import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listPendingBusinessListings } from "@/lib/db/catalog-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePlatformAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await listPendingBusinessListings();
  return NextResponse.json({ pending });
}
