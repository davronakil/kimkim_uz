import { nanoid } from "nanoid";
import { getDb } from "@/lib/cloudflare";
import { buildTelegramDeepLink } from "@/lib/auth/telegram";
import { isLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";

export const LOGIN_START_PREFIX = "login_";
export const LOGIN_CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CHALLENGE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export type LoginChallenge = {
  id: string;
  user_id: string | null;
  redirect_to: string;
  locale: string;
  consumed_at: string | null;
  created_at: string;
  expires_at: string;
};

export type LoginChallengeStatus = "pending" | "ready" | "consumed" | "expired";

export function parseLoginStartParam(startParam: string | null): string | null {
  if (!startParam) return null;
  const match = startParam.match(/^login_([A-Za-z0-9_-]+)$/i);
  return match?.[1] ?? null;
}

export function isSafeRedirectPath(path: string | undefined | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function safeRedirectPath(path: string | undefined | null, fallback = "/events"): string {
  return isSafeRedirectPath(path) ? path : fallback;
}

function challengeLocale(value: string | undefined | null): Locale {
  return value && isLocale(value) ? value : "uz";
}

export function loginChallengeStatus(challenge: LoginChallenge | null): LoginChallengeStatus {
  if (!challenge) return "expired";
  if (Date.parse(challenge.expires_at) <= Date.now()) return "expired";
  if (challenge.consumed_at) return "consumed";
  if (challenge.user_id) return "ready";
  return "pending";
}

export async function createLoginChallenge(input: {
  redirectTo?: string | null;
  locale?: string | null;
}): Promise<LoginChallenge> {
  const db = await getDb();
  const id = nanoid();
  const expiresAt = new Date(Date.now() + LOGIN_CHALLENGE_TTL_MS).toISOString();
  const redirectTo = safeRedirectPath(input.redirectTo);
  const locale = challengeLocale(input.locale);

  await db
    .prepare(
      `INSERT INTO login_challenges (id, redirect_to, locale, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(id, redirectTo, locale, expiresAt)
    .run();

  const row = await getLoginChallenge(id);
  if (!row) throw new Error("Failed to create login challenge");
  return row;
}

export async function getLoginChallenge(id: string): Promise<LoginChallenge | null> {
  if (!LOGIN_CHALLENGE_ID_RE.test(id)) return null;
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM login_challenges WHERE id = ?")
      .bind(id)
      .first<LoginChallenge>()) ?? null
  );
}

export async function confirmLoginChallenge(
  id: string,
  userId: string,
): Promise<LoginChallenge | null> {
  const existing = await getLoginChallenge(id);
  const status = loginChallengeStatus(existing);
  if (!existing || status === "expired") return null;
  if (existing.user_id && existing.user_id !== userId) return null;

  if (!existing.user_id) {
    const db = await getDb();
    await db
      .prepare(
        `UPDATE login_challenges
         SET user_id = ?
         WHERE id = ?
           AND user_id IS NULL
           AND consumed_at IS NULL
           AND datetime(expires_at) > datetime('now')`,
      )
      .bind(userId, id)
      .run();
  }

  return getLoginChallenge(id);
}

export async function consumeLoginChallenge(id: string): Promise<LoginChallenge | null> {
  const existing = await getLoginChallenge(id);
  if (loginChallengeStatus(existing) !== "ready" || !existing?.user_id) {
    return null;
  }

  const db = await getDb();
  const result = await db
    .prepare(
      `UPDATE login_challenges
       SET consumed_at = datetime('now')
       WHERE id = ?
         AND user_id IS NOT NULL
         AND consumed_at IS NULL
         AND datetime(expires_at) > datetime('now')`,
    )
    .bind(id)
    .run();

  if (!result.meta.changes) return null;
  return getLoginChallenge(id);
}

export function buildLoginTelegramUrl(botUsername: string, challengeId: string): string {
  return buildTelegramDeepLink(botUsername, `${LOGIN_START_PREFIX}${challengeId}`);
}

export function buildLoginVerifyPath(locale: string, challengeId: string): string {
  return `/${challengeLocale(locale)}/login?verify=${encodeURIComponent(challengeId)}`;
}
