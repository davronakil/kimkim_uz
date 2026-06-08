import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { removePlatformAdmin } from "@/lib/db/catalog-queries";
import { requireSuperadmin } from "@/lib/platform/admin";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireSuperadmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await removePlatformAdmin(userId);
  return NextResponse.json({ ok: true });
}
