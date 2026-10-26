import { getDb, getEnv } from "@/lib/cloudflare";
import type { User } from "@/types";

/** Legacy username pin — prefer SUPERADMIN_TELEGRAM_IDS in production. */
export const SUPERADMIN_TELEGRAM_USERNAME = "davron_tx";

export type PlatformAdminRole = "admin" | "superadmin";

function parseSuperadminTelegramIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function usernameMatchesSuperadmin(username: string | null | undefined) {
  return username?.toLowerCase() === SUPERADMIN_TELEGRAM_USERNAME.toLowerCase();
}

type AdminUser = Pick<User, "id" | "username"> & { telegram_id?: string | null };

async function isConfiguredSuperadmin(user: AdminUser) {
  const env = await getEnv();
  const ids = parseSuperadminTelegramIds(env.SUPERADMIN_TELEGRAM_IDS);
  if (ids.size > 0) {
    return Boolean(user.telegram_id && ids.has(user.telegram_id));
  }
  return usernameMatchesSuperadmin(user.username);
}

export async function ensureSuperadminRecord(user: AdminUser) {
  if (!(await isConfiguredSuperadmin(user))) return;

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO platform_admins (user_id, role, granted_by)
       VALUES (?, 'superadmin', ?)
       ON CONFLICT(user_id) DO UPDATE SET role = 'superadmin'`,
    )
    .bind(user.id, user.id)
    .run();
}

export async function getPlatformAdminRole(user: AdminUser): Promise<PlatformAdminRole | null> {
  await ensureSuperadminRecord(user);

  if (await isConfiguredSuperadmin(user)) {
    return "superadmin";
  }

  const db = await getDb();
  const row = await db
    .prepare("SELECT role FROM platform_admins WHERE user_id = ?")
    .bind(user.id)
    .first<{ role: PlatformAdminRole }>();

  return row?.role ?? null;
}

export async function isPlatformAdmin(user: AdminUser) {
  return (await getPlatformAdminRole(user)) !== null;
}

export async function isSuperadmin(user: AdminUser) {
  return (await getPlatformAdminRole(user)) === "superadmin";
}

export async function requirePlatformAdmin(user: AdminUser) {
  const role = await getPlatformAdminRole(user);
  if (!role) {
    throw new Error("Forbidden");
  }
  return role;
}

export async function requireSuperadmin(user: AdminUser) {
  const role = await requirePlatformAdmin(user);
  if (role !== "superadmin") {
    throw new Error("Forbidden");
  }
}
