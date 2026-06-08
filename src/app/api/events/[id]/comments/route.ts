import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, runInBackground } from "@/lib/cloudflare";
import { isEventMember } from "@/lib/db/queries";
import { notifyNewComment } from "@/lib/telegram/notifications";

const commentSchema = z.object({
  body: z.string().min(1).max(5000),
  parent_id: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await context.params;
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  const db = await getDb();
  const commentId = nanoid();

  await db
    .prepare(
      "INSERT INTO comments (id, event_id, parent_id, user_id, body) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(
      commentId,
      eventId,
      parsed.data.parent_id ?? null,
      user.id,
      parsed.data.body,
    )
    .run();

  void runInBackground(
    notifyNewComment({
      eventId,
      author: user,
      body: parsed.data.body,
      parentId: parsed.data.parent_id ?? null,
      authorUserId: user.id,
    }),
  );

  return NextResponse.json({ id: commentId });
}
