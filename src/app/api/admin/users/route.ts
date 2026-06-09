import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { countAdminUsers, listAdminUsers } from "@/lib/db/admin-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";

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
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 25), 100);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") ?? 0), 0);

  const [users, total] = await Promise.all([
    listAdminUsers({ q, limit, offset }),
    countAdminUsers(q),
  ]);

  return NextResponse.json({ users, total, limit, offset });
}
