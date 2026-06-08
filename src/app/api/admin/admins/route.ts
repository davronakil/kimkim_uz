import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addPlatformAdmin,
  getUserByUsername,
  listPlatformAdmins,
} from "@/lib/db/catalog-queries";
import { isSuperadmin, requireSuperadmin } from "@/lib/platform/admin";
import { z } from "zod";

const addAdminSchema = z.object({
  username: z.string().min(2).max(64),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superadmin = await isSuperadmin(user);
  if (!superadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await listPlatformAdmins();
  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireSuperadmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = addAdminSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const target = await getUserByUsername(parsed.data.username);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await addPlatformAdmin(target.id, user.id);
  return NextResponse.json({ ok: true, userId: target.id });
}
