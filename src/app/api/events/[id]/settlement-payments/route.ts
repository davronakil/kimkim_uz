import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById } from "@/lib/db/queries";
import { markSettlementPaid, settleErrorStatus } from "@/lib/expense/settle-up";

const markPaidSchema = z.object({
  counterpart_user_id: z.string().min(1),
  currency: z.string().min(3).max(3),
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
  const parsed = markPaidSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await markSettlementPaid({
    event,
    actorId: user.id,
    counterpartId: parsed.data.counterpart_user_id,
    currency: parsed.data.currency,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: settleErrorStatus(result.error) });
  }
  return NextResponse.json({ payment: result.value }, { status: 201 });
}
