import { upsertTelegramUser } from "@/lib/auth/session";
import { runInBackground } from "@/lib/cloudflare";
import {
  getEventByInviteCode,
  getEventById,
  isEventMember,
  listEventMembers,
  recordEventReferral,
} from "@/lib/db/queries";
import { exceedsGuestCap } from "@/lib/events/headcount";
import {
  getEventRsvp,
  rsvpDeclined,
  rsvpGoing,
  rsvpMaybe,
  upsertEventRsvp,
} from "@/lib/events/rsvp";
import { isLocale } from "@/lib/locale";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendTelegramMessage,
} from "@/lib/telegram/bot";
import {
  beginAlbumCollect,
  finishAlbumSession,
  sendOthersAlbumPhotos,
  startAlbumFlow,
} from "@/lib/telegram/flows/album";
import { startLogExpenseForEvent } from "@/lib/telegram/flows/log-expense";
import { readAlbumSessionData, getBotSession } from "@/lib/telegram/sessions";
import { t } from "@/lib/telegram/i18n";
import {
  buildEventOpenUrl,
  languagePickerKeyboard,
  rsvpGuestCountKeyboard,
} from "@/lib/telegram/keyboards";
import { linkTelegramChat } from "@/lib/telegram/chat";
import { resolveBotLocale } from "@/lib/telegram/locale";
import { eventGroupThreadId } from "@/lib/telegram/group";
import { notifyMemberJoined, notifyRsvpChanged } from "@/lib/telegram/notifications";
import type { TelegramCallbackQuery, TelegramMessage } from "@/lib/telegram/types";
import type { Event } from "@/types";

function parseRsvpCallbackData(data: string, prefix: string) {
  if (!data.startsWith(prefix)) return null;
  const [inviteCode, referrerUserId] = data.slice(prefix.length).split(":");
  if (!inviteCode) return null;
  return { inviteCode, referrerUserId };
}

function parseRsvpGuestCallbackData(data: string) {
  if (!data.startsWith("rsvpg:")) return null;
  const [, countRaw, eventId] = data.split(":");
  const count = Number(countRaw);
  if (!eventId || !Number.isInteger(count) || count < 0 || count > 20) return null;
  return { eventId, count };
}

/** Reply in the topic the button was tapped in. A group send with no thread lands in General. */
function callbackThreadId(message: TelegramMessage, event: Event): number | undefined {
  const fromMessage = message.message_thread_id;
  if (typeof fromMessage === "number" && Number.isFinite(fromMessage)) return fromMessage;
  if (event.telegram_chat_id && String(message.chat.id) === String(event.telegram_chat_id)) {
    return eventGroupThreadId(event);
  }
  return undefined;
}

async function showGuestCountPicker({
  chatId,
  messageId,
  messageThreadId,
  eventId,
  eventTitle,
  locale,
}: {
  chatId: number;
  messageId: number;
  messageThreadId?: number;
  eventId: string;
  eventTitle: string;
  locale: ReturnType<typeof resolveBotLocale>;
}) {
  const strings = t(locale);
  await sendTelegramMessage(chatId, strings.rsvpGuestPrompt(eventTitle), {
    parse_mode: "HTML",
    message_thread_id: messageThreadId,
    reply_markup: rsvpGuestCountKeyboard({
      eventId,
      labels: {
        onlyMe: strings.rsvpGuestOnlyMe,
        openEvent: strings.openEvent,
        eventUrl: buildEventOpenUrl(eventId, locale),
      },
    }),
  });
  await editMessageReplyMarkup(chatId, messageId);
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

    const previousRsvp = await getEventRsvp(event.id, user.id);
    const members = await listEventMembers(event.id);
    if (
      exceedsGuestCap(members, {
        userId: user.id,
        status: "going",
        additionalGuestCount: previousRsvp?.additional_guest_count ?? 0,
        maxGuests: event.max_guest_count,
      })
    ) {
      await answerCallbackQuery(query.id, strings.eventFull, true);
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
    } else if (previousRsvp?.status !== "going") {
      void runInBackground(
        notifyRsvpChanged({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
          status: "going",
          additionalGuestCount: previousRsvp?.additional_guest_count ?? 0,
        }),
      );
    }

    await answerCallbackQuery(
      query.id,
      wasMember ? strings.rsvpAlreadyGoing : strings.rsvpGoingConfirmed,
    );
    await showGuestCountPicker({
      chatId: message.chat.id,
      messageId: message.message_id,
      messageThreadId: callbackThreadId(message, event),
      eventId: event.id,
      eventTitle: event.title,
      locale,
    });
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

    const wasMember = await isEventMember(event.id, user.id);
    const previousRsvp = await getEventRsvp(event.id, user.id);
    await rsvpDeclined(event.id, user.id);
    if (wasMember && (previousRsvp?.status !== "declined" || previousRsvp.additional_guest_count !== 0)) {
      void runInBackground(
        notifyRsvpChanged({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
          status: "declined",
          additionalGuestCount: 0,
          guestCountChanged: (previousRsvp?.additional_guest_count ?? 0) !== 0,
        }),
      );
    }
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

    const previousRsvp = await getEventRsvp(event.id, user.id);
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
    } else if (previousRsvp?.status !== "maybe") {
      void runInBackground(
        notifyRsvpChanged({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
          status: "maybe",
          additionalGuestCount: previousRsvp?.additional_guest_count ?? 0,
        }),
      );
    }

    await answerCallbackQuery(query.id, strings.rsvpMaybeConfirmed);
    await showGuestCountPicker({
      chatId: message.chat.id,
      messageId: message.message_id,
      messageThreadId: callbackThreadId(message, event),
      eventId: event.id,
      eventTitle: event.title,
      locale,
    });
    return;
  }

  if (data.startsWith("rsvpg:")) {
    const parsed = parseRsvpGuestCallbackData(data);
    if (!parsed) {
      await answerCallbackQuery(query.id);
      return;
    }

    const event = await getEventById(parsed.eventId);
    if (!event) {
      await answerCallbackQuery(query.id, strings.inviteNotFound, true);
      return;
    }

    const member = await isEventMember(event.id, user.id);
    if (!member) {
      await answerCallbackQuery(query.id, strings.expenseNotMember, true);
      return;
    }

    const previousRsvp = await getEventRsvp(event.id, user.id);
    const status = previousRsvp?.status ?? "going";
    const previousCount = previousRsvp?.additional_guest_count ?? 0;
    const members = await listEventMembers(event.id);
    if (
      exceedsGuestCap(members, {
        userId: user.id,
        status,
        additionalGuestCount: parsed.count,
        maxGuests: event.max_guest_count,
      })
    ) {
      await answerCallbackQuery(query.id, strings.eventFull, true);
      return;
    }

    await upsertEventRsvp(event.id, user.id, status, parsed.count);

    if (previousCount !== parsed.count) {
      void runInBackground(
        notifyRsvpChanged({
          eventId: event.id,
          member: user,
          memberUserId: user.id,
          status,
          additionalGuestCount: parsed.count,
          guestCountChanged: true,
        }),
      );
    }

    await answerCallbackQuery(query.id, strings.rsvpGuestSaved(parsed.count));
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    return;
  }

  if (data === "albdone") {
    if (message.chat.type !== "private") {
      await answerCallbackQuery(query.id, strings.albumNeedPrivate, true);
      return;
    }
    const session = await getBotSession(message.chat.id);
    const album = session?.flow === "album" ? readAlbumSessionData(session) : {};
    await answerCallbackQuery(query.id);
    if (album.eventId) {
      await finishAlbumSession(message.chat.id, user, locale, album.eventId, album.added ?? 0);
    }
    return;
  }

  if (data.startsWith("albdl:")) {
    const eventId = data.slice("albdl:".length);
    if (!eventId || message.chat.type !== "private") {
      await answerCallbackQuery(query.id, strings.albumNeedPrivate, true);
      return;
    }
    await answerCallbackQuery(query.id);
    await sendOthersAlbumPhotos(message.chat.id, user, locale, eventId);
    return;
  }

  if (data === "alb:pick") {
    if (message.chat.type !== "private") {
      await answerCallbackQuery(query.id, strings.albumNeedPrivate, true);
      return;
    }
    await answerCallbackQuery(query.id);
    await startAlbumFlow(message.chat.id, user, locale);
    return;
  }

  if (data.startsWith("alb:")) {
    const eventId = data.slice("alb:".length);
    if (!eventId || message.chat.type !== "private") {
      await answerCallbackQuery(query.id, strings.albumNeedPrivate, true);
      return;
    }
    const member = await isEventMember(eventId, user.id);
    if (!member) {
      await answerCallbackQuery(query.id, strings.albumNotMember, true);
      return;
    }
    await answerCallbackQuery(query.id);
    await beginAlbumCollect(message.chat.id, user, locale, eventId);
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
