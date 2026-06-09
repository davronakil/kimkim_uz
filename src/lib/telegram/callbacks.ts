import { upsertTelegramUser } from "@/lib/auth/session";
import { runInBackground } from "@/lib/cloudflare";
import {
  getEventByInviteCode,
  isEventMember,
  recordEventReferral,
} from "@/lib/db/queries";
import { rsvpDeclined, rsvpGoing, rsvpMaybe } from "@/lib/events/rsvp";
import { isLocale } from "@/lib/locale";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendTelegramMessage,
} from "@/lib/telegram/bot";
import { startLogExpenseForEvent } from "@/lib/telegram/flows/log-expense";
import { t } from "@/lib/telegram/i18n";
import { languagePickerKeyboard } from "@/lib/telegram/keyboards";
import { linkTelegramChat } from "@/lib/telegram/chat";
import { resolveBotLocale } from "@/lib/telegram/locale";
import { notifyMemberJoined } from "@/lib/telegram/notifications";
import type { TelegramCallbackQuery } from "@/lib/telegram/types";

function parseRsvpCallbackData(data: string, prefix: string) {
  if (!data.startsWith(prefix)) return null;
  const [inviteCode, referrerUserId] = data.slice(prefix.length).split(":");
  if (!inviteCode) return null;
  return { inviteCode, referrerUserId };
}

export async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const data = query.data ?? "";
  const from = query.from;
  const message = query.message;
  if (!from || !message) return;

  const user = await upsertTelegramUser({
    telegram_id: String(from.id),
    first_name: from.first_name,
    last_name: from.last_name ?? null,
    username: from.username ?? null,
    language_code: null,
  });

  if (message.chat.type === "private") {
    await linkTelegramChat(from, message.chat.id);
  }

  const locale = resolveBotLocale(from, user);
  const strings = t(locale);

  if (data.startsWith("rsvp:y:")) {
    const rsvp = parseRsvpCallbackData(data, "rsvp:y:");
    if (!rsvp) {
      await answerCallbackQuery(query.id);
      return;
    }

    const event = await getEventByInviteCode(rsvp.inviteCode);
    if (!event) {
      await answerCallbackQuery(query.id, strings.inviteNotFound, true);
      return;
    }

    const { wasMember } = await rsvpGoing(event, user);
    if (!wasMember) {
      await recordEventReferral({
        eventId: event.id,
        inviteCode: rsvp.inviteCode,
        referredUserId: user.id,
        referrerUserId: rsvp.referrerUserId,
        source: "telegram",
      });

      void runInBackground(
        notifyMemberJoined({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
        }),
      );
    }

    await answerCallbackQuery(
      query.id,
      wasMember ? strings.rsvpAlreadyGoing : strings.rsvpGoingConfirmed,
    );
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    return;
  }

  if (data.startsWith("rsvp:n:")) {
    const rsvp = parseRsvpCallbackData(data, "rsvp:n:");
    if (!rsvp) {
      await answerCallbackQuery(query.id);
      return;
    }

    const event = await getEventByInviteCode(rsvp.inviteCode);
    if (!event) {
      await answerCallbackQuery(query.id, strings.inviteNotFound, true);
      return;
    }

    await rsvpDeclined(event.id, user.id);
    await answerCallbackQuery(query.id, strings.rsvpDeclinedConfirmed);
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    return;
  }

  if (data.startsWith("rsvp:m:")) {
    const rsvp = parseRsvpCallbackData(data, "rsvp:m:");
    if (!rsvp) {
      await answerCallbackQuery(query.id);
      return;
    }

    const event = await getEventByInviteCode(rsvp.inviteCode);
    if (!event) {
      await answerCallbackQuery(query.id, strings.inviteNotFound, true);
      return;
    }

    const { wasMember } = await rsvpMaybe(event, user);
    if (!wasMember) {
      await recordEventReferral({
        eventId: event.id,
        inviteCode: rsvp.inviteCode,
        referredUserId: user.id,
        referrerUserId: rsvp.referrerUserId,
        source: "telegram",
      });

      void runInBackground(
        notifyMemberJoined({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
        }),
      );
    }

    await answerCallbackQuery(query.id, strings.rsvpMaybeConfirmed);
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    return;
  }

  if (data.startsWith("exp:")) {
    const eventId = data.slice("exp:".length);
    const member = await isEventMember(eventId, user.id);
    if (!member) {
      await answerCallbackQuery(query.id, strings.expenseNotMember, true);
      return;
    }

    await startLogExpenseForEvent(message.chat.id, user, locale, eventId);
    await answerCallbackQuery(query.id, strings.expensePickEventDone);
    return;
  }

  if (data === "lang:pick") {
    await answerCallbackQuery(query.id);
    await sendTelegramMessage(message.chat.id, strings.chooseLanguage, {
      reply_markup: languagePickerKeyboard(),
    });
    return;
  }

  if (data.startsWith("lang:")) {
    const code = data.slice("lang:".length);
    if (!isLocale(code)) {
      await answerCallbackQuery(query.id);
      return;
    }

    await upsertTelegramUser({
      telegram_id: String(from.id),
      first_name: from.first_name,
      last_name: from.last_name ?? null,
      username: from.username ?? null,
      appLocale: code,
    });
    await answerCallbackQuery(query.id, t(code).langSet(code));
    return;
  }

  await answerCallbackQuery(query.id);
}
