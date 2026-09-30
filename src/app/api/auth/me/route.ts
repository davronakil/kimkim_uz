import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserTimezone } from "@/lib/db/queries";
import { isValidTimeZone } from "@/lib/events/timezone";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      timezone: user.timezone,
      telegram_notifications_enabled: Boolean(user.telegram_chat_id),
    },
  });
}

/** Remembers the browser's zone so bot-created events land on the right clock. */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { timezone?: unknown } | null;
  const timezone = typeof body?.timezone === "string" ? body.timezone : null;
  if (!isValidTimeZone(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  if (timezone !== user.timezone) {
    await updateUserTimezone(user.id, timezone);
  }

  return NextResponse.json({ ok: true });
}
