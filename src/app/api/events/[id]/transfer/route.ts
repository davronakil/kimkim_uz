import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isEventOwner, transferEventOwnership } from "@/lib/db/queries";

const transferSchema = z.object({
  user_id: z.string().min(1),
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
  const owner = await isEventOwner(eventId, user.id);
  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = transferSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const transferred = await transferEventOwnership(
    eventId,
    user.id,
    parsed.data.user_id,
  );

  if (!transferred) {
    return NextResponse.json({ error: "Could not transfer ownership" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
