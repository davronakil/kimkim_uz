import { upsertTelegramUser } from "@/lib/auth/session";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import {
  groupT,
  isGroupChatType,
  linkGroupToEvent,
  parseGroupStartLink,
  parseLinkInviteCode,
  sendLinkedEventInfo,
  unlinkGroupFromEvent,
} from "@/lib/telegram/group";
import { resolveBotLocale } from "@/lib/telegram/locale";
import type { TelegramMessage } from "@/lib/telegram/types";

function isUnlinkCommand(text: string) {
  return /^\/unlink(?:@\w+)?\s*$/i.test(text.trim());
}

function isEventCommand(text: string) {
  return /^\/event(?:@\w+)?\s*$/i.test(text.trim());
}

export async function handleGroupMessage(message: TelegramMessage) {
  if (!message.from) return;

  const chatType = message.chat.type;
  if (!isGroupChatType(chatType)) return;

  const user = await upsertTelegramUser({
    telegram_id: String(message.from.id),
    first_name: message.from.first_name,
    last_name: message.from.last_name ?? null,
    username: message.from.username ?? null,
    language_code: null,
  });

  const locale = resolveBotLocale(message.from, user);
  const strings = groupT(locale);
  const text = message.text?.trim() ?? "";

  if (message.new_chat_members?.length) {
    const botAdded = message.new_chat_members.some((member) => member.is_bot);
    const startCode = parseGroupStartLink(text);
    if (botAdded && startCode) {
      await linkGroupToEvent({
        chatId: message.chat.id,
        inviteCode: startCode,
        telegramUserId: String(message.from.id),
        locale,
      });
      return;
    }
  }

  if (!text) return;

  const linkCode = parseLinkInviteCode(text) ?? parseGroupStartLink(text);
  if (linkCode) {
    await linkGroupToEvent({
      chatId: message.chat.id,
      inviteCode: linkCode,
      telegramUserId: String(message.from.id),
      locale,
    });
    return;
  }

  if (isUnlinkCommand(text)) {
    await unlinkGroupFromEvent({
      chatId: message.chat.id,
      telegramUserId: String(message.from.id),
      locale,
    });
    return;
  }

  if (isEventCommand(text)) {
    await sendLinkedEventInfo(message.chat.id, locale);
    return;
  }

  if (text.startsWith("/")) {
    await sendTelegramMessage(
      message.chat.id,
      `${strings.notLinked}\n\n<code>/link INVITE_CODE</code>`,
      { parse_mode: "HTML" },
    );
  }
}
