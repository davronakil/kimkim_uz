import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { countAdminEvents, listAdminEvents } from "@/lib/db/admin-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import type { EventVisibility } from "@/types";

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

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const visibilityParam = request.nextUrl.searchParams.get("visibility");
  const visibility: "all" | EventVisibility =
    visibilityParam === "public" || visibilityParam === "private" ? visibilityParam : "all";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 25), 100);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") ?? 0), 0);

  const [events, total] = await Promise.all([
    listAdminEvents({ q, visibility, limit, offset }),
    countAdminEvents(q, visibility),
  ]);

  return NextResponse.json({ events, total, limit, offset });
}
