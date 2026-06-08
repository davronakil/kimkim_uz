import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/cloudflare";
import { isEventMember } from "@/lib/db/queries";

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, commentId } = await context.params;
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const comment = await db
    .prepare("SELECT id, user_id FROM comments WHERE id = ? AND event_id = ?")
    .bind(commentId, eventId)
    .first<{ id: string; user_id: string }>();

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (comment.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasReplies = await db
    .prepare("SELECT 1 FROM comments WHERE parent_id = ? LIMIT 1")
    .bind(commentId)
    .first();

  if (hasReplies) {
    return NextResponse.json({ error: "Has replies" }, { status: 409 });
  }

  await db.prepare("DELETE FROM comments WHERE id = ?").bind(commentId).run();

  return NextResponse.json({ ok: true });
}
