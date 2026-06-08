import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runInBackground } from "@/lib/cloudflare";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyMemberJoined } from "@/lib/telegram/notifications";
import {
  getEventByInviteCode,
  isEventMember,
  joinEvent,
  listEventMembers,
} from "@/lib/db/queries";

const joinSchema = z.object({
  code: z.string().min(4).max(32),
});

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const event = await getEventByInviteCode(code);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await listEventMembers(event.id);
  const user = await getCurrentUser();
  const joined = user ? await isEventMember(event.id, user.id) : false;

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      starts_at: event.starts_at,
      location_name: event.location_name,
      invite_code: event.invite_code,
    },
    member_count: members.length,
    joined,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = joinSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const event = await getEventByInviteCode(parsed.data.code);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const alreadyMember = await isEventMember(event.id, user.id);
  await joinEvent(event.id, user.id);

  if (!alreadyMember) {
    void runInBackground(
      notifyMemberJoined({
        eventId: event.id,
        member: user,
        memberUserId: user.id,
      }),
    );
  }

  return NextResponse.json({ event_id: event.id });
}
