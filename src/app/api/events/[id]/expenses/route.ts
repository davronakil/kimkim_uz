import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/cloudflare";
import { isEventMember, listEventMembers } from "@/lib/db/queries";
import { majorToCents } from "@/lib/utils";

const expenseSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().default("UZS"),
  payer_id: z.string(),
  split_user_ids: z.array(z.string()).min(1),
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
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = expenseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
  }

  const members = await listEventMembers(eventId);
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(parsed.data.payer_id)) {
    return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
  }

  for (const splitUserId of parsed.data.split_user_ids) {
    if (!memberIds.has(splitUserId)) {
      return NextResponse.json({ error: "Invalid split member" }, { status: 400 });
    }
  }

  const amountCents = majorToCents(parsed.data.amount);
  const splitCount = parsed.data.split_user_ids.length;
  const baseShare = Math.floor(amountCents / splitCount);
  let remainder = amountCents - baseShare * splitCount;

  const db = await getDb();
  const expenseId = nanoid();

  await db
    .prepare(
      "INSERT INTO expenses (id, event_id, payer_id, amount_cents, currency, description) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      expenseId,
      eventId,
      parsed.data.payer_id,
      amountCents,
      parsed.data.currency,
      parsed.data.description,
    )
    .run();

  for (const splitUserId of parsed.data.split_user_ids) {
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder -= 1;
    await db
      .prepare(
        "INSERT INTO expense_splits (expense_id, user_id, amount_cents) VALUES (?, ?, ?)",
      )
      .bind(expenseId, splitUserId, baseShare + extra)
      .run();
  }

  return NextResponse.json({ id: expenseId });
}
