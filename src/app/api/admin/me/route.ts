import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlatformAdminRole } from "@/lib/platform/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ admin: false, role: null });
  }

  const role = await getPlatformAdminRole(user);
  return NextResponse.json({ admin: Boolean(role), role });
}
