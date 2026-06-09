import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventByIdForAdmin, updateEventVisibility } from "@/lib/db/admin-queries";
import { requirePlatformAdmin } from "@/lib/platform/admin";

const patchSchema = z.object({
  visibility: z.enum(["public", "private"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requirePlatformAdmin(user);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const event = await getEventByIdForAdmin(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await updateEventVisibility(id, parsed.data.visibility);
  return NextResponse.json({ ok: true, visibility: parsed.data.visibility });
}
