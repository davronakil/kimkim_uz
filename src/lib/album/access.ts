import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById, isEventMember, isEventOwner } from "@/lib/db/queries";
import type { Event, User } from "@/types";

export async function requireAlbumMember(eventId: string): Promise<
  | { ok: true; user: User; event: Event; owner: boolean }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const owner = await isEventOwner(eventId, user.id);
  return { ok: true, user, event, owner };
}
