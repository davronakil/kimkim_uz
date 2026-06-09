import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById, isEventMember } from "@/lib/db/queries";
import { upsertEventRsvp } from "@/lib/events/rsvp";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const rsvpSchema = z.object({
  status: z.enum(["going", "maybe", "declined"]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await isEventMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = rsvpSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  await upsertEventRsvp(id, user.id, parsed.data.status);

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
