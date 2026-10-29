import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById } from "@/lib/db/queries";
import { settleErrorStatus, settleUpEvent } from "@/lib/expense/settle-up";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await context.params;
  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await settleUpEvent({ event, actorId: user.id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: settleErrorStatus(result.error) });
  }
  return NextResponse.json(
    { settle_up_id: result.value.settleUpId, count: result.value.payments.length },
    { status: 201 },
  );
}
