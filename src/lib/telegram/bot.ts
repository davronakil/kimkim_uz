import { getEnv } from "@/lib/cloudflare";
import type { InlineButton } from "@/lib/telegram/keyboards";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramReplyMarkup = {
  inline_keyboard: InlineButton[][];
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: TelegramReplyMarkup;
    message_thread_id?: number | null;
    link_preview?: boolean;
  },
) {
  const env = await getEnv();
  const threadId =
    typeof options?.message_thread_id === "number" ? options.message_thread_id : undefined;

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    // Bot replies already carry their own buttons, so a preview card buys nothing
    // and costs the client a remote image fetch plus an extra layout pass on a
    // message it is rendering mid-animation.
    link_preview_options: { is_disabled: options?.link_preview !== true },
  };
  if (options?.parse_mode) payload.parse_mode = options.parse_mode;
  if (options?.reply_markup) payload.reply_markup = options.reply_markup;
  if (threadId != null) payload.message_thread_id = threadId;

  async function post(body: Record<string, unknown>) {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return (await response.json()) as TelegramApiResponse<unknown>;
  }

  let data = await post(payload);
  if (
    !data.ok &&
    threadId != null &&
    /message thread not found/i.test(data.description ?? "")
  ) {
    const { message_thread_id: _removed, ...withoutThread } = payload;
    void _removed;
    data = await post(withoutThread);
  }

  if (!data.ok) {
    throw new Error(data.description ?? "Telegram sendMessage failed");
  }

  return data;
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
) {
  const env = await getEnv();
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup?: TelegramReplyMarkup,
) {
  const env = await getEnv();
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    }),
  });
}

export function parseStartParam(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

export { parseJoinStartParam } from "@/lib/telegram/locale";

export function buildAppUrl(path: string, appUrl?: string) {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
