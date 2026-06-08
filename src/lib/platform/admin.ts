import { getDb } from "@/lib/cloudflare";
import type { User } from "@/types";

export const SUPERADMIN_TELEGRAM_USERNAME = "davron_tx";

export type PlatformAdminRole = "admin" | "superadmin";

function usernameMatchesSuperadmin(username: string | null | undefined) {
  return username?.toLowerCase() === SUPERADMIN_TELEGRAM_USERNAME.toLowerCase();
}

export async function ensureSuperadminRecord(user: Pick<User, "id" | "username">) {
  if (!usernameMatchesSuperadmin(user.username)) return;

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

export async function getPlatformAdminRole(
  user: Pick<User, "id" | "username">,
): Promise<PlatformAdminRole | null> {
  await ensureSuperadminRecord(user);

  if (usernameMatchesSuperadmin(user.username)) {
    return "superadmin";
  }

  const db = await getDb();
  const row = await db
    .prepare("SELECT role FROM platform_admins WHERE user_id = ?")
    .bind(user.id)
    .first<{ role: PlatformAdminRole }>();

  return row?.role ?? null;
}

export async function isPlatformAdmin(user: Pick<User, "id" | "username">) {
  return (await getPlatformAdminRole(user)) !== null;
}

export async function isSuperadmin(user: Pick<User, "id" | "username">) {
  return (await getPlatformAdminRole(user)) === "superadmin";
}

export async function requirePlatformAdmin(user: Pick<User, "id" | "username">) {
  const role = await getPlatformAdminRole(user);
  if (!role) {
    throw new Error("Forbidden");
  }
  return role;
}

export async function requireSuperadmin(user: Pick<User, "id" | "username">) {
  const role = await requirePlatformAdmin(user);
  if (role !== "superadmin") {
    throw new Error("Forbidden");
  }
}
