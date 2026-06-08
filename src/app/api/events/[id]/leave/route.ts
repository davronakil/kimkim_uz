import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isEventMember, leaveEvent } from "@/lib/db/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await isEventMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const left = await leaveEvent(id, user.id);
  if (!left) {
    return NextResponse.json({ error: "Owners cannot leave their event" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
