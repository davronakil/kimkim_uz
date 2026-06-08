import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getEventNotificationMode,
  isEventMember,
  setEventNotificationMode,
} from "@/lib/db/queries";

const notificationSchema = z.object({
  mode: z.enum(["instant", "digest", "muted"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await isEventMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = await getEventNotificationMode(id, user.id);
  return NextResponse.json({ mode });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await isEventMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = notificationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification mode" }, { status: 400 });
  }

  await setEventNotificationMode({
    eventId: id,
    userId: user.id,
    mode: parsed.data.mode,
  });

  return NextResponse.json({ mode: parsed.data.mode });
}
