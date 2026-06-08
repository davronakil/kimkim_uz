import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getDb, getEnv } from "@/lib/cloudflare";
import type { User } from "@/types";

export const SESSION_COOKIE = "kimkim_session";
const SESSION_TTL_DAYS = 30;

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
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

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
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
        input.language_code ?? null,
        existing.id,
      )
      .run();

    return {
      ...existing,
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      username: input.username ?? null,
      photo_url: input.photo_url ?? null,
    };
  }

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
      input.language_code ?? "en",
    )
    .run();

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();

  if (!user) throw new Error("Failed to create user");
  return user;
}
