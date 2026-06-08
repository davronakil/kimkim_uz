import { getDb } from "@/lib/cloudflare";
import type {
  BotLocale,
  BotSession,
  BotSessionFlow,
  CreateEventSessionData,
  ExpenseSessionData,
} from "@/lib/telegram/types";

export async function getBotSession(chatId: number): Promise<BotSession | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM bot_sessions WHERE chat_id = ?")
      .bind(String(chatId))
      .first<BotSession>()) ?? null
  );
}

export async function upsertBotSession({
  chatId,
  userId,
  flow,
  step,
  data,
  locale,
}: {
  chatId: number;
  userId: string;
  flow: BotSessionFlow | null;
  step: string | null;
  data: Record<string, unknown>;
  locale: BotLocale;
}) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO bot_sessions (chat_id, user_id, flow, step, data, locale, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(chat_id) DO UPDATE SET
         user_id = excluded.user_id,
         flow = excluded.flow,
         step = excluded.step,
         data = excluded.data,
         locale = excluded.locale,
         updated_at = datetime('now')`,
    )
    .bind(String(chatId), userId, flow, step, JSON.stringify(data), locale)
    .run();
}

export async function clearBotSession(chatId: number) {
  const db = await getDb();
  await db.prepare("DELETE FROM bot_sessions WHERE chat_id = ?").bind(String(chatId)).run();
}

export function readCreateEventData(session: BotSession): CreateEventSessionData {
  try {
    return JSON.parse(session.data) as CreateEventSessionData;
  } catch {
    return {};
  }
}

export function readExpenseSessionData(session: BotSession): ExpenseSessionData {
  try {
    return JSON.parse(session.data) as ExpenseSessionData;
  } catch {
    return {};
  }
}
