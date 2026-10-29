import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { settleErrorStatus, undoSettleUp } from "@/lib/expense/settle-up";

type RouteContext = {
  params: Promise<{ id: string; settleUpId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, settleUpId } = await context.params;
  const result = await undoSettleUp({ eventId, actorId: user.id, settleUpId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: settleErrorStatus(result.error) });
  }
  return NextResponse.json({ removed: result.value });
}
