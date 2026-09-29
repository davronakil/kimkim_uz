import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById, isEventOwner } from "@/lib/db/queries";
import { rerunEventRecord } from "@/lib/events/rerun";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const owner = await isEventOwner(id, user.id);
  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { eventId } = await rerunEventRecord(event, user.id);
    return NextResponse.json({ id: eventId });
  } catch (error) {
    console.error("Event rerun failed:", error);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }
}
