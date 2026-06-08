import { getDb } from "@/lib/cloudflare";
import { upsertTelegramUser } from "@/lib/auth/session";

type TelegramFrom = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export async function linkTelegramChat(from: TelegramFrom, chatId: number) {
  await upsertTelegramUser({
    telegram_id: String(from.id),
    first_name: from.first_name,
    last_name: from.last_name ?? null,
    username: from.username ?? null,
    language_code: from.language_code ?? null,
  });

  const db = await getDb();
  await db
    .prepare(
      `UPDATE users
       SET telegram_chat_id = ?, updated_at = datetime('now')
       WHERE telegram_id = ?`,
    )
    .bind(String(chatId), String(from.id))
    .run();
}
