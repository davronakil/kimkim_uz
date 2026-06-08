import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTelegramLogin, verifyTelegramWebAppInitData } from "@/lib/auth/telegram";
import { createSession, setSessionCookie, upsertTelegramUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";

const loginSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.string(),
  hash: z.string(),
});

export async function POST(request: NextRequest) {
  const env = await getEnv();
  const body = await request.json();

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const valid = verifyTelegramLogin(parsed.data, env.TELEGRAM_BOT_TOKEN);
  if (!valid) {
    return NextResponse.json({ error: "Invalid Telegram auth" }, { status: 401 });
  }

  const user = await upsertTelegramUser({
    telegram_id: parsed.data.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    username: parsed.data.username,
    photo_url: parsed.data.photo_url,
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const env = await getEnv();
  const body = (await request.json()) as { initData?: string };
  const initData = body.initData;

  if (!initData || typeof initData !== "string") {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const data = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN);
  if (!data?.user) {
    return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
  }

  const telegramUser = JSON.parse(data.user) as {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
  };

  const user = await upsertTelegramUser({
    telegram_id: String(telegramUser.id),
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
    username: telegramUser.username,
    photo_url: telegramUser.photo_url,
    language_code: telegramUser.language_code,
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ user });
}
