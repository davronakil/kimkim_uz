import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { settleErrorStatus, undoSettlementPayment } from "@/lib/expense/settle-up";

type RouteContext = {
  params: Promise<{ id: string; paymentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, paymentId } = await context.params;
  const result = await undoSettlementPayment({ eventId, actorId: user.id, paymentId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: settleErrorStatus(result.error) });
  }
  return NextResponse.json({ ok: true });
}
