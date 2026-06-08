import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getEventById,
  isEventMember,
  isEventOwner,
  setManualEventPayment,
} from "@/lib/db/queries";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

const paymentSchema = z.object({
  paid: z.boolean(),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await context.params;
  const [event, owner, member] = await Promise.all([
    getEventById(id),
    isEventOwner(id, currentUser.id),
    isEventMember(id, userId),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const parsed = paymentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  await setManualEventPayment({
    eventId: id,
    userId,
    markedByUserId: currentUser.id,
    amountCents: event.ticket_price_cents ?? 0,
    currency: event.ticket_currency ?? "UZS",
    status: parsed.data.paid ? "completed" : "failed",
    note: parsed.data.note,
  });

  return NextResponse.json({ ok: true });
}
