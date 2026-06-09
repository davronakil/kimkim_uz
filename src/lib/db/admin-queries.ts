import { getDb } from "@/lib/cloudflare";
import type {
  BusinessListing,
  BusinessListingStatus,
  Event,
  EventVisibility,
  EventWithCreator,
  User,
} from "@/types";

export type PlatformOverviewStats = {
  users: number;
  events: number;
  publicEvents: number;
  catalogPending: number;
  catalogApproved: number;
  catalogRejected: number;
  vouches: number;
};

export type AdminUserRow = Pick<
  User,
  "id" | "username" | "first_name" | "last_name" | "language_code" | "created_at"
> & {
  event_count: number;
  listing_count: number;
};

export type AdminEventRow = EventWithCreator & {
  member_count: number;
};

export type AdminBusinessListingRow = BusinessListing &
  Pick<User, "first_name" | "last_name" | "username"> & {
    vouch_count: number;
  };

function userSearchClause(q?: string) {
  if (!q?.trim()) return { sql: "", params: [] as string[] };
  const term = `%${q.trim().replace(/^@/, "").toLowerCase()}%`;
  return {
    sql: `AND (
      LOWER(u.username) LIKE ? OR
      LOWER(u.first_name) LIKE ? OR
      LOWER(COALESCE(u.last_name, '')) LIKE ?
    )`,
    params: [term, term, term],
  };
}

function eventSearchClause(q?: string) {
  if (!q?.trim()) return { sql: "", params: [] as string[] };
  const term = `%${q.trim().toLowerCase()}%`;
  return {
    sql: `AND (
      LOWER(e.title) LIKE ? OR
      LOWER(COALESCE(e.location_name, '')) LIKE ? OR
      LOWER(COALESCE(u.username, '')) LIKE ? OR
      LOWER(u.first_name) LIKE ?
    )`,
    params: [term, term, term, term],
  };
}

export async function getPlatformOverviewStats(): Promise<PlatformOverviewStats> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM events) AS events,
         (SELECT COUNT(*) FROM events WHERE visibility = 'public') AS publicEvents,
         (SELECT COUNT(*) FROM business_listings WHERE status = 'pending') AS catalogPending,
         (SELECT COUNT(*) FROM business_listings WHERE status = 'approved') AS catalogApproved,
         (SELECT COUNT(*) FROM business_listings WHERE status = 'rejected') AS catalogRejected,
         (SELECT COUNT(*) FROM business_listing_vouches) AS vouches`,
    )
    .first<PlatformOverviewStats>();

  return {
    users: row?.users ?? 0,
    events: row?.events ?? 0,
    publicEvents: row?.publicEvents ?? 0,
    catalogPending: row?.catalogPending ?? 0,
    catalogApproved: row?.catalogApproved ?? 0,
    catalogRejected: row?.catalogRejected ?? 0,
    vouches: row?.vouches ?? 0,
  };
}

export async function countAdminUsers(q?: string) {
  const db = await getDb();
  const search = userSearchClause(q);
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM users u WHERE 1=1 ${search.sql}`)
    .bind(...search.params)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function listAdminUsers({
  q,
  limit = 25,
  offset = 0,
}: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUserRow[]> {
  const db = await getDb();
  const search = userSearchClause(q);
  const result = await db
    .prepare(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.language_code, u.created_at,
              (SELECT COUNT(*) FROM event_members em WHERE em.user_id = u.id) AS event_count,
              (SELECT COUNT(*) FROM business_listings bl WHERE bl.representative_user_id = u.id) AS listing_count
       FROM users u
       WHERE 1=1 ${search.sql}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...search.params, limit, offset)
    .all<AdminUserRow>();

  return (result.results ?? []).map((row) => ({
    ...row,
    event_count: Number(row.event_count ?? 0),
    listing_count: Number(row.listing_count ?? 0),
  }));
}

export async function countAdminEvents(
  q?: string,
  visibility: "all" | EventVisibility = "all",
) {
  const db = await getDb();
  const search = eventSearchClause(q);
  const visibilitySql =
    visibility === "all" ? "" : "AND e.visibility = ?";
  const visibilityParams = visibility === "all" ? [] : [visibility];

  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM events e
       JOIN users u ON u.id = e.creator_id
       WHERE 1=1 ${search.sql} ${visibilitySql}`,
    )
    .bind(...search.params, ...visibilityParams)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function listAdminEvents({
  q,
  visibility = "all",
  limit = 25,
  offset = 0,
}: {
  q?: string;
  visibility?: "all" | EventVisibility;
  limit?: number;
  offset?: number;
}): Promise<AdminEventRow[]> {
  const db = await getDb();
  const search = eventSearchClause(q);
  const visibilitySql =
    visibility === "all" ? "" : "AND e.visibility = ?";
  const visibilityParams = visibility === "all" ? [] : [visibility];

  const result = await db
    .prepare(
      `SELECT e.*,
              u.first_name AS creator_first_name,
              u.last_name AS creator_last_name,
              u.username AS creator_username,
              (SELECT COUNT(*) FROM event_members em WHERE em.event_id = e.id) AS member_count
       FROM events e
       JOIN users u ON u.id = e.creator_id
       WHERE 1=1 ${search.sql} ${visibilitySql}
       ORDER BY e.starts_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...search.params, ...visibilityParams, limit, offset)
    .all<AdminEventRow>();

  return (result.results ?? []).map((row) => ({
    ...row,
    payment_mode: row.payment_mode ?? "free",
    ticket_currency: row.ticket_currency ?? "UZS",
    visibility: row.visibility === "public" ? "public" : "private",
    member_count: Number(row.member_count ?? 0),
  }));
}

export async function updateEventVisibility(eventId: string, visibility: EventVisibility) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE events SET visibility = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(visibility, eventId)
    .run();
}

export async function listAdminBusinessListings(
  status: BusinessListingStatus | "all" = "all",
): Promise<AdminBusinessListingRow[]> {
  const db = await getDb();
  const statusSql = status === "all" ? "" : "WHERE bl.status = ?";
  const bind = status === "all" ? [] : [status];

  const result = await db
    .prepare(
      `SELECT bl.*, u.first_name, u.last_name, u.username,
              COUNT(blv.user_id) AS vouch_count
       FROM business_listings bl
       JOIN users u ON u.id = bl.representative_user_id
       LEFT JOIN business_listing_vouches blv ON blv.listing_id = bl.id
       ${statusSql}
       GROUP BY bl.id
       ORDER BY
         CASE bl.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         bl.updated_at DESC`,
    )
    .bind(...bind)
    .all<AdminBusinessListingRow>();

  return (result.results ?? []).map((row) => ({
    ...row,
    vouch_count: Number(row.vouch_count ?? 0),
  }));
}

export async function getEventByIdForAdmin(eventId: string): Promise<Event | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first<Event>();

  if (!row) return null;
  return {
    ...row,
    payment_mode: row.payment_mode ?? "free",
    ticket_currency: row.ticket_currency ?? "UZS",
    visibility: row.visibility === "public" ? "public" : "private",
  };
}
