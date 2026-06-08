import { nanoid } from "nanoid";
import { getDb } from "@/lib/cloudflare";
import type {
  BusinessListing,
  BusinessListingEntitlement,
  BusinessListingStatus,
  PlatformAdmin,
  User,
} from "@/types";

export async function getBusinessListingById(id: string): Promise<BusinessListing | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM business_listings WHERE id = ?")
      .bind(id)
      .first<BusinessListing>()) ?? null
  );
}

export async function listApprovedBusinessListings(category?: string): Promise<BusinessListing[]> {
  const db = await getDb();
  const query = category
    ? `SELECT * FROM business_listings
       WHERE status = 'approved' AND category = ?
       ORDER BY published_at DESC, name ASC`
    : `SELECT * FROM business_listings
       WHERE status = 'approved'
       ORDER BY published_at DESC, name ASC`;

  const result = category
    ? await db.prepare(query).bind(category).all<BusinessListing>()
    : await db.prepare(query).all<BusinessListing>();

  return result.results ?? [];
}

export async function listBusinessListingsForUser(userId: string): Promise<BusinessListing[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT * FROM business_listings
       WHERE representative_user_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<BusinessListing>();

  return result.results ?? [];
}

export async function countActiveBusinessListingsForUser(userId: string) {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM business_listings
       WHERE representative_user_id = ? AND status != 'rejected'`,
    )
    .bind(userId)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function getBusinessListingEntitlement(
  userId: string,
): Promise<BusinessListingEntitlement> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM business_listing_entitlements WHERE user_id = ?")
    .bind(userId)
    .first<BusinessListingEntitlement>();

  if (row) return row;

  await db
    .prepare(
      `INSERT INTO business_listing_entitlements (user_id, included_slots, paid_slots)
       VALUES (?, 1, 0)`,
    )
    .bind(userId)
    .run();

  return {
    user_id: userId,
    included_slots: 1,
    paid_slots: 0,
    updated_at: new Date().toISOString(),
  };
}

export async function getBusinessListingSlotSummary(userId: string) {
  const entitlement = await getBusinessListingEntitlement(userId);
  const used = await countActiveBusinessListingsForUser(userId);
  const total = entitlement.included_slots + entitlement.paid_slots;

  return { entitlement, used, total, remaining: Math.max(total - used, 0) };
}

export async function createBusinessListing(input: {
  representativeUserId: string;
  name: string;
  description?: string | null;
  category: string;
  phone?: string | null;
  telegramUsername?: string | null;
  websiteUrl?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  coverImageKey?: string | null;
}) {
  const db = await getDb();
  const id = nanoid();

  await db
    .prepare(
      `INSERT INTO business_listings (
        id, representative_user_id, name, description, category,
        phone, telegram_username, website_url,
        location_name, location_address, location_lat, location_lng,
        cover_image_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(
      id,
      input.representativeUserId,
      input.name,
      input.description ?? null,
      input.category,
      input.phone ?? null,
      input.telegramUsername ?? null,
      input.websiteUrl ?? null,
      input.locationName ?? null,
      input.locationAddress ?? null,
      input.locationLat ?? null,
      input.locationLng ?? null,
      input.coverImageKey ?? null,
    )
    .run();

  return id;
}

export async function updateBusinessListing(
  id: string,
  input: {
    name: string;
    description?: string | null;
    category: string;
    phone?: string | null;
    telegramUsername?: string | null;
    websiteUrl?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    coverImageKey?: string | null;
    resetForReview?: boolean;
  },
) {
  const db = await getDb();
  const statusClause = input.resetForReview
    ? ", status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, published_at = NULL"
    : "";
  const coverClause =
    input.coverImageKey !== undefined ? "cover_image_key = ?," : "";

  const bindings = [
    input.name,
    input.description ?? null,
    input.category,
    input.phone ?? null,
    input.telegramUsername ?? null,
    input.websiteUrl ?? null,
    input.locationName ?? null,
    input.locationAddress ?? null,
    input.locationLat ?? null,
    input.locationLng ?? null,
    ...(input.coverImageKey !== undefined ? [input.coverImageKey] : []),
    id,
  ];

  await db
    .prepare(
      `UPDATE business_listings SET
        name = ?, description = ?, category = ?,
        phone = ?, telegram_username = ?, website_url = ?,
        location_name = ?, location_address = ?, location_lat = ?, location_lng = ?,
        ${coverClause}
        updated_at = datetime('now')
        ${statusClause}
       WHERE id = ?`,
    )
    .bind(...bindings)
    .run();
}

export async function reviewBusinessListing(input: {
  id: string;
  status: Extract<BusinessListingStatus, "approved" | "rejected">;
  reviewerId: string;
  rejectionReason?: string | null;
}) {
  const db = await getDb();
  const publishedAt = input.status === "approved" ? "datetime('now')" : "NULL";

  await db
    .prepare(
      `UPDATE business_listings SET
        status = ?,
        rejection_reason = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        published_at = ${publishedAt},
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      input.status,
      input.status === "rejected" ? (input.rejectionReason ?? null) : null,
      input.reviewerId,
      input.id,
    )
    .run();
}

export async function listPendingBusinessListings(): Promise<BusinessListing[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT * FROM business_listings
       WHERE status = 'pending'
       ORDER BY created_at ASC`,
    )
    .all<BusinessListing>();

  return result.results ?? [];
}

export async function listPlatformAdmins(): Promise<
  Array<PlatformAdmin & Pick<User, "username" | "first_name" | "last_name">>
> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT pa.*, u.username, u.first_name, u.last_name
       FROM platform_admins pa
       JOIN users u ON u.id = pa.user_id
       ORDER BY pa.created_at ASC`,
    )
    .all<PlatformAdmin & Pick<User, "username" | "first_name" | "last_name">>();

  return result.results ?? [];
}

export async function addPlatformAdmin(userId: string, grantedBy: string) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO platform_admins (user_id, role, granted_by)
       VALUES (?, 'admin', ?)
       ON CONFLICT(user_id) DO UPDATE SET role = CASE
         WHEN platform_admins.role = 'superadmin' THEN 'superadmin'
         ELSE 'admin'
       END`,
    )
    .bind(userId, grantedBy)
    .run();
}

export async function removePlatformAdmin(userId: string) {
  const db = await getDb();
  await db
    .prepare("DELETE FROM platform_admins WHERE user_id = ? AND role != 'superadmin'")
    .bind(userId)
    .run();
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
      .bind(username.replace(/^@/, ""))
      .first<User>()) ?? null
  );
}

export async function createPendingBusinessSlotPayment(input: {
  userId: string;
  stripeCheckoutSessionId: string;
  amountCents: number;
  currency: string;
  slotsGranted?: number;
}) {
  const db = await getDb();
  const id = nanoid();

  await db
    .prepare(
      `INSERT INTO business_slot_payments (
        id, user_id, stripe_checkout_session_id, amount_cents, currency, status, slots_granted
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(
      id,
      input.userId,
      input.stripeCheckoutSessionId,
      input.amountCents,
      input.currency,
      input.slotsGranted ?? 1,
    )
    .run();

  return id;
}

export async function fulfillBusinessSlotPayment(input: {
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  userId: string;
  slotsGranted: number;
}) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE business_slot_payments SET
        status = 'completed',
        stripe_payment_intent_id = ?
       WHERE stripe_checkout_session_id = ? AND user_id = ?`,
    )
    .bind(input.stripePaymentIntentId, input.stripeCheckoutSessionId, input.userId)
    .run();

  await getBusinessListingEntitlement(input.userId);

  await db
    .prepare(
      `UPDATE business_listing_entitlements SET
        paid_slots = paid_slots + ?,
        updated_at = datetime('now')
       WHERE user_id = ?`,
    )
    .bind(input.slotsGranted, input.userId)
    .run();
}

export async function getBusinessListingWithRepresentative(id: string) {
  const db = await getDb();
  return db
    .prepare(
      `SELECT bl.*, u.first_name, u.last_name, u.username, u.photo_url
       FROM business_listings bl
       JOIN users u ON u.id = bl.representative_user_id
       WHERE bl.id = ?`,
    )
    .bind(id)
    .first<
      BusinessListing &
        Pick<User, "first_name" | "last_name" | "username" | "photo_url">
    >();
}
