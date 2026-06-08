import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  clearEventTelegramGroup,
  getEventById,
  isEventOwner,
} from "@/lib/db/queries";
import { postEventShareToGroup } from "@/lib/telegram/group";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const owner = await isEventOwner(id, user.id);
  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await clearEventTelegramGroup(id);
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const owner = await isEventOwner(id, user.id);
  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await getEventById(id);
  if (!event?.telegram_chat_id) {
    return NextResponse.json({ error: "No linked group" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "share") {
    const posted = await postEventShareToGroup(id);
    if (!posted) {
      return NextResponse.json({ error: "Could not post to group" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
