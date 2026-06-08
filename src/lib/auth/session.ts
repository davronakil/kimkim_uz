import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import type { Locale } from "@/i18n/config";
import { resolveLocaleFromTelegramCode } from "@/lib/locale";
import { getDb, getEnv } from "@/lib/cloudflare";
import type { User } from "@/types";

export const SESSION_COOKIE = "kimkim_session";
const SESSION_TTL_DAYS = 30;

export type SessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export function getSessionCookieOptions(secure = true): SessionCookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export function applySessionCookie(
  response: Response,
  token: string,
  secure = true,
): Response {
  const headers = new Headers(response.headers);
  const options = getSessionCookieOptions(secure);
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${options.sameSite}`,
    `Max-Age=${options.maxAge}`,
  ];
  if (options.secure) parts.push("Secure");
  headers.append("Set-Cookie", parts.join("; "));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function createSession(userId: string): Promise<string> {
  const env = await getEnv();
  const db = await getDb();
  const sessionId = nanoid();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .bind(sessionId, userId, expiresAt.toISOString())
    .run();

  const token = await new SignJWT({ sid: sessionId, uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(getSecretKey(env.SESSION_SECRET));

  return token;
}

export async function setSessionCookie(token: string, secure = true) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions(secure));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const env = await getEnv();
    const { payload } = await jwtVerify(token, getSecretKey(env.SESSION_SECRET));
    const sessionId = payload.sid as string | undefined;
    if (!sessionId) return null;

    const db = await getDb();
    const session = await db
      .prepare(
        `SELECT u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')`,
      )
      .bind(sessionId)
      .first<User>();

    return session ?? null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  try {
    const env = await getEnv();
    const { payload } = await jwtVerify(token, getSecretKey(env.SESSION_SECRET));
    const sessionId = payload.sid as string | undefined;
    if (!sessionId) return;

    const db = await getDb();
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  } catch {
    // ignore invalid tokens
  }

  await clearSessionCookie();
}

export async function upsertTelegramUser(input: {
  telegram_id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  language_code?: string | null;
  /** App locale from page URL, bot picker, or invite deep link. */
  appLocale?: Locale | null;
}): Promise<User> {
  const db = await getDb();
  const existing = await db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .bind(input.telegram_id)
    .first<User>();

  if (existing) {
    await db
      .prepare(
        `UPDATE users
         SET first_name = ?, last_name = ?, username = ?, photo_url = ?,
             language_code = COALESCE(?, language_code), updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        input.first_name,
        input.last_name ?? null,
        input.username ?? null,
        input.photo_url ?? null,
        input.appLocale ?? null,
        existing.id,
      )
      .run();

    return {
      ...existing,
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      username: input.username ?? null,
      photo_url: input.photo_url ?? null,
      language_code: input.appLocale ?? existing.language_code,
    };
  }

  const initialLocale =
    input.appLocale ?? resolveLocaleFromTelegramCode(input.language_code);

  const id = nanoid();
  await db
    .prepare(
      `INSERT INTO users (id, telegram_id, username, first_name, last_name, photo_url, language_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.telegram_id,
      input.username ?? null,
      input.first_name,
      input.last_name ?? null,
      input.photo_url ?? null,
      initialLocale,
    )
    .run();

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();

  if (!user) throw new Error("Failed to create user");
  return user;
}
