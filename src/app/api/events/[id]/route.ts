import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, getMediaBucket, runInBackground } from "@/lib/cloudflare";
import {
  getEventById,
  isEventMember,
  isEventOwner,
  listEventComments,
  listEventExpenses,
  listEventMembers,
  listEventPaymentSummaries,
} from "@/lib/db/queries";
import {
  buildBalancesFromExpenses,
  calculateSettlements,
} from "@/lib/expense/settlement";
import { parseEventFormData, resolveTicketPriceCents } from "@/lib/events/form";
import { notifyEventUpdated } from "@/lib/telegram/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await isEventMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [members, comments, expenses, paymentSummaries] = await Promise.all([
    listEventMembers(id),
    listEventComments(id),
    listEventExpenses(id),
    listEventPaymentSummaries(id),
  ]);

  const balances = buildBalancesFromExpenses(
    expenses.map((expense) => ({
      payer_id: expense.payer_id,
      amount_cents: expense.amount_cents,
      splits: (expense.splits ?? []).map((split) => ({
        user_id: split.user_id,
        amount_cents: split.amount_cents,
      })),
    })),
  );

  const settlements = calculateSettlements(
    [...balances.entries()].map(([userId, balanceCents]) => ({
      userId,
      balanceCents,
    })),
    expenses[0]?.currency ?? "UZS",
  );

  const canEdit = await isEventOwner(id, user.id);

  return NextResponse.json({
    event,
    members,
    comments,
    expenses,
    settlements,
    paymentSummaries,
    canEdit,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const formData = await request.formData();
  const payload = parseEventFormData(formData);
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
  }

  const db = await getDb();
  let coverImageKey = event.cover_image_key;
  const removeCover = formData.get("remove_cover") === "true";

  if (removeCover) {
    coverImageKey = null;
  }

  const cover = formData.get("cover_image");
  if (cover instanceof File && cover.size > 0) {
    const media = await getMediaBucket();
    coverImageKey = `events/${id}/${Date.now()}-${cover.name}`;
    await media.put(coverImageKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });
  }

  const clearLocation = formData.get("clear_location") === "true";
  const hasLocationUpdate = clearLocation || Boolean(payload.data.location_name);

  const locationName = clearLocation
    ? null
    : hasLocationUpdate
      ? (payload.data.location_name ?? null)
      : event.location_name;
  const locationAddress = clearLocation
    ? null
    : hasLocationUpdate
      ? (payload.data.location_address ?? null)
      : event.location_address;
  const locationLat = clearLocation
    ? null
    : hasLocationUpdate
      ? (payload.data.location_lat ?? null)
      : event.location_lat;
  const locationLng = clearLocation
    ? null
    : hasLocationUpdate
      ? (payload.data.location_lng ?? null)
      : event.location_lng;

  await db
    .prepare(
      `UPDATE events SET
        title = ?, description = ?, starts_at = ?, ends_at = ?,
        location_name = ?, location_address = ?, location_lat = ?, location_lng = ?,
        cover_image_key = ?, payment_mode = ?, ticket_price_cents = ?, ticket_currency = ?,
        visibility = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      payload.data.title,
      payload.data.description ?? null,
      payload.data.starts_at,
      payload.data.ends_at ?? null,
      locationName,
      locationAddress,
      locationLat,
      locationLng,
      coverImageKey,
      payload.data.payment_mode,
      resolveTicketPriceCents(payload.data.payment_mode, payload.data.ticket_price),
      payload.data.payment_mode === "paid" ? payload.data.ticket_currency : event.ticket_currency ?? "UZS",
      payload.data.visibility,
      id,
    )
    .run();

  const changes: Array<"title" | "time" | "location" | "description"> = [];
  if (payload.data.title !== event.title) changes.push("title");
  if (payload.data.starts_at !== event.starts_at) changes.push("time");
  if (
    locationName !== event.location_name ||
    locationAddress !== event.location_address ||
    locationLat !== event.location_lat ||
    locationLng !== event.location_lng
  ) {
    changes.push("location");
  }
  if ((payload.data.description ?? null) !== (event.description ?? null)) {
    changes.push("description");
  }

  if (changes.length > 0) {
    void runInBackground(
      notifyEventUpdated({
        eventId: id,
        editorUserId: user.id,
        editor: user,
        changes,
      }),
    );
  }

  const updated = await getEventById(id);
  return NextResponse.json({ event: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

  const db = await getDb();
  await db.prepare("DELETE FROM events WHERE id = ?").bind(id).run();

  return NextResponse.json({ ok: true });
}
