import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventMemberRole, isEventOwner, removeEventMember } from "@/lib/db/queries";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, userId: targetUserId } = await context.params;
  const owner = await isEventOwner(eventId, user.id);
  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Use leave instead" }, { status: 400 });
  }

  const targetRole = await getEventMemberRole(eventId, targetUserId);
  if (!targetRole) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (targetRole === "owner") {
    return NextResponse.json({ error: "Cannot remove organizer" }, { status: 400 });
  }

  await removeEventMember(eventId, targetUserId);

  return NextResponse.json({ ok: true });
}
