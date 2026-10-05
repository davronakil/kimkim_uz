import {
  clearEventTelegramGroup,
  getEventById,
  getEventByInviteCode,
  getEventByTelegramGroupId,
  getUserById,
  isEventOwnerByTelegramId,
  listEventMembers,
  renameEventTelegramTopics,
  setEventTelegramGroup,
} from "@/lib/db/queries";
import { goingHeadcount } from "@/lib/events/headcount";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import { guestCapLine } from "@/lib/telegram/guest-cap";
import { inviteRsvpKeyboard } from "@/lib/telegram/keyboards";
import { t as botStrings } from "@/lib/telegram/i18n";
import { formatEventDateTimeWithZone } from "@/lib/events/timezone";
import { resolveUserLocale } from "@/lib/locale";
import type { BotLocale, TelegramMessage } from "@/lib/telegram/types";
import type { Event } from "@/types";

export function isGroupChatType(type?: string) {
  return type === "group" || type === "supergroup";
}

export function buildStartGroupLink(botUsername: string, inviteCode: string) {
  return `https://t.me/${botUsername}?startgroup=link_${encodeURIComponent(inviteCode)}`;
}

export function parseLinkInviteCode(text: string): string | null {
  const match = text.match(/^\/link(?:@\w+)?(?:\s+)([a-z0-9]+)\s*$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function parseGroupStartLink(text: string): string | null {
  const match = text.match(/^\/start(?:@\w+)?\s+link_([a-z0-9]+)\s*$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function forumTopicFromMessage(message: TelegramMessage): {
  messageThreadId: number | null;
  topicName: string | null;
} {
  const threadId = message.message_thread_id;
  const inTopic =
    message.is_topic_message === true &&
    typeof threadId === "number" &&
    Number.isFinite(threadId);

  if (!inTopic) {
    return { messageThreadId: null, topicName: null };
  }

  return { messageThreadId: threadId, topicName: topicNameForThread(message, threadId) };
}

/**
 * Telegram attaches reply_to_message on topic messages. That reply is often a
 * different topic's creation service message (its name stays the original one,
 * such as "General Chat"), while message_thread_id is the topic actually used.
 * Trust a creation name only when that service message is this thread's root.
 * A later rename arrives as forum_topic_edited.
 */
export function topicNameForThread(message: TelegramMessage, threadId: number): string | null {
  const sources = [message, message.reply_to_message].filter(
    (source): source is TelegramMessage => Boolean(source),
  );

  for (const source of sources) {
    const edited = source.forum_topic_edited?.name?.trim();
    if (!edited) continue;
    if (source.message_thread_id === threadId || source.message_id === threadId) return edited;
  }

  for (const source of sources) {
    const created = source.forum_topic_created;
    if (!created || created.is_name_implicit) continue;
    if (source.message_id !== threadId) continue;
    const name = created.name?.trim();
    if (name) return name;
  }

  return null;
}

export async function rememberForumTopicRename(message: TelegramMessage) {
  const threadId = message.message_thread_id;
  const renamed = message.forum_topic_edited?.name?.trim();
  if (!renamed || typeof threadId !== "number" || !Number.isFinite(threadId)) return;
  await renameEventTelegramTopics(String(message.chat.id), threadId, renamed);
}

export function eventGroupThreadId(
  event: Pick<Event, "telegram_message_thread_id">,
): number | undefined {
  const id = event.telegram_message_thread_id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (id != null) {
    const parsed = Number(id);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function threadOptions(messageThreadId?: number | null) {
  return typeof messageThreadId === "number" ? { message_thread_id: messageThreadId } : {};
}

/** Posted into the linked topic. Same short line in each group language, without naming the topic. */
function linkedTopicConfirm(title: string) {
  return `✅ <b>${title}</b>\nShu mavzuga ulandi.\nLinked to this topic.\nПривязано к этой теме.`;
}

const groupStrings = {
  en: {
    linked: (title: string) =>
      `✅ This group is now linked to <b>${title}</b>. I'll post joins, schedule changes, and reminders here.`,
    linkFailed: "Could not link this group. Check the invite code and try again.",
    notOwner: "Only the event organizer can link a group.",
    unlinked: "Group disconnected from KimKim.",
    notLinked: "This group isn't linked to an event. Organizer: add the bot, then send /link INVITE_CODE in the topic KimKim should use.",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "No event linked to this group.",
    openEvent: "Open event",
    joinEvent: "Join / RSVP",
    shareIntro: (title: string, spots?: string | null) =>
      spots
        ? `📣 <b>${title}</b> — plan on KimKim.uz\n${spots}`
        : `📣 <b>${title}</b> — plan on KimKim.uz`,
    albumStatus: (title: string, count: number, limit: number) =>
      `Shared album for <b>${title}</b>: ${count} of ${limit} photos.\n\nAdd photos in a private chat with me. I can also send you everyone else's pictures there.`,
    albumAdd: "Add photos",
  },
  ru: {
    linked: (title: string) =>
      `✅ Группа привязана к событию <b>${title}</b>. Здесь будут присоединения, изменения и напоминания.`,
    linkFailed: "Не удалось привязать группу. Проверьте код приглашения и попробуйте снова.",
    notOwner: "Только организатор может привязать группу.",
    unlinked: "Группа отключена от KimKim.",
    notLinked: "Группа не привязана к событию. Организатор: добавьте бота и отправьте /link INVITE_CODE в нужной теме.",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "К этой группе не привязано событие.",
    openEvent: "Открыть событие",
    joinEvent: "Присоединиться / RSVP",
    shareIntro: (title: string, spots?: string | null) =>
      spots
        ? `📣 <b>${title}</b> — планируйте на KimKim.uz\n${spots}`
        : `📣 <b>${title}</b> — планируйте на KimKim.uz`,
    albumStatus: (title: string, count: number, limit: number) =>
      `Общий альбом <b>${title}</b>: ${count} из ${limit} фото.\n\nДобавляйте снимки в личном чате со мной — там же можно получить фото остальных.`,
    albumAdd: "Добавить фото",
  },
  uz: {
    linked: (title: string) =>
      `✅ Guruh <b>${title}</b> eventiga ulandi. Qo'shilishlar, o'zgarishlar va eslatmalar shu yerga keladi.`,
    linkFailed: "Ulanmadi. Invite kodini tekshirib qayta urinib ko'ring.",
    notOwner: "Faqat event organizatori guruhni ulashi mumkin.",
    unlinked: "Guruh KimKim dan uzildi.",
    notLinked: "Guruh eventga ulanmagan. Organizator: botni qo'shing, keyin KimKim yozadigan mavzuda /link INVITE_CODE yuboring",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "Bu guruh eventga ulanmagan.",
    openEvent: "Eventni ochish",
    joinEvent: "Qo'shilish",
    shareIntro: (title: string, spots?: string | null) =>
      spots
        ? `📣 <b>${title}</b> — KimKim.uz da reja\n${spots}`
        : `📣 <b>${title}</b> — KimKim.uz da reja`,
    albumStatus: (title: string, count: number, limit: number) =>
      `<b>${title}</b> umumiy albomi: ${count} / ${limit} rasm.\n\nRasmlarni menga shaxsiy chatda yuboring — boshqalarning rasmlarini ham o'sha yerda olasiz.`,
    albumAdd: "Rasm qo'shish",
  },
} as const;

export function groupT(locale: BotLocale) {
  return groupStrings[locale];
}

export async function ownerLocaleForEvent(event: Event): Promise<BotLocale> {
  const owner = await getUserById(event.creator_id);
  return resolveUserLocale(owner);
}

export function formatEventWhen(iso: string, locale: BotLocale, timeZone: string) {
  return formatEventDateTimeWithZone(iso, locale, timeZone);
}

export async function linkGroupToEvent({
  chatId,
  inviteCode,
  telegramUserId,
  locale,
  messageThreadId = null,
  topicName = null,
}: {
  chatId: number;
  inviteCode: string;
  telegramUserId: string;
  locale: BotLocale;
  messageThreadId?: number | null;
  topicName?: string | null;
}) {
  const strings = groupT(locale);
  const event = await getEventByInviteCode(inviteCode);
  const thread = threadOptions(messageThreadId);

  if (!event) {
    await sendTelegramMessage(chatId, strings.linkFailed, thread);
    return { ok: false as const };
  }

  const isOwner = await isEventOwnerByTelegramId(event.id, telegramUserId);
  if (!isOwner) {
    await sendTelegramMessage(chatId, strings.notOwner, thread);
    return { ok: false as const };
  }

  await setEventTelegramGroup(event.id, String(chatId), messageThreadId, topicName);

  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);
  const inviteStrings = botStrings(locale);
  const confirmText =
    messageThreadId != null ? linkedTopicConfirm(event.title) : strings.linked(event.title);

  await sendTelegramMessage(chatId, confirmText, {
    parse_mode: "HTML",
    message_thread_id: messageThreadId,
    reply_markup: event.invite_code
      ? inviteRsvpKeyboard({
          inviteCode: event.invite_code,
          labels: {
            going: inviteStrings.rsvpGoing,
            maybe: inviteStrings.rsvpMaybe,
            declined: inviteStrings.rsvpDeclined,
            openEvent: strings.openEvent,
            eventUrl,
          },
        })
      : {
          inline_keyboard: [[{ text: strings.openEvent, url: eventUrl }]],
        },
  });

  return { ok: true as const, event };
}

export async function unlinkGroupFromEvent({
  chatId,
  telegramUserId,
  locale,
  messageThreadId = null,
}: {
  chatId: number;
  telegramUserId: string;
  locale: BotLocale;
  messageThreadId?: number | null;
}) {
  const strings = groupT(locale);
  const thread = threadOptions(messageThreadId);
  const linked = await getEventByTelegramGroupId(String(chatId), messageThreadId);

  if (!linked) {
    await sendTelegramMessage(chatId, strings.notLinked, thread);
    return;
  }

  const isOwner = await isEventOwnerByTelegramId(linked.id, telegramUserId);
  if (!isOwner) {
    await sendTelegramMessage(chatId, strings.notOwner, thread);
    return;
  }

  await clearEventTelegramGroup(linked.id);
  await sendTelegramMessage(chatId, strings.unlinked, thread);
}

export async function sendLinkedEventInfo(
  chatId: number,
  locale: BotLocale,
  messageThreadId?: number | null,
) {
  const strings = groupT(locale);
  const thread = threadOptions(messageThreadId);
  const event = await getEventByTelegramGroupId(String(chatId), messageThreadId);

  if (!event) {
    await sendTelegramMessage(chatId, strings.noEvent, thread);
    return;
  }

  const when = formatEventWhen(event.starts_at, locale, event.timezone);
  const url = buildAppUrl(`/${locale}/events/${event.id}`);
  await sendTelegramMessage(chatId, strings.eventInfo(event.title, when, url), {
    parse_mode: "HTML",
    ...thread,
    reply_markup: {
      inline_keyboard: [[{ text: strings.openEvent, url }]],
    },
  });
}

export async function notifyEventGroup(
  eventId: string,
  buildMessage: (locale: BotLocale, event: Event) => string,
  buttons?: (locale: BotLocale, event: Event) => Array<{ text: string; url: string }>,
) {
  const event = await getEventById(eventId);
  if (!event?.telegram_chat_id) return;

  const locale = await ownerLocaleForEvent(event);
  const text = buildMessage(locale, event);
  const chatId = Number(event.telegram_chat_id);

  const inlineButtons = buttons?.(locale, event);
  await sendTelegramMessage(chatId, text, {
    parse_mode: "HTML",
    message_thread_id: eventGroupThreadId(event),
    reply_markup: inlineButtons?.length
      ? { inline_keyboard: [inlineButtons] }
      : undefined,
  });
}

export async function postEventShareToGroup(eventId: string) {
  const event = await getEventById(eventId);
  if (!event?.telegram_chat_id || !event.invite_code) return false;

  const locale = await ownerLocaleForEvent(event);
  const strings = groupT(locale);
  const when = formatEventWhen(event.starts_at, locale, event.timezone);

  const inviteStrings = botStrings(locale);
  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);
  const members = await listEventMembers(eventId);
  const spots = guestCapLine(locale, goingHeadcount(members), event.max_guest_count);

  await sendTelegramMessage(
    Number(event.telegram_chat_id),
    `${strings.shareIntro(event.title, spots)}\n${when}`,
    {
      parse_mode: "HTML",
      message_thread_id: eventGroupThreadId(event),
      reply_markup: inviteRsvpKeyboard({
        inviteCode: event.invite_code,
        labels: {
          going: inviteStrings.rsvpGoing,
          maybe: inviteStrings.rsvpMaybe,
          declined: inviteStrings.rsvpDeclined,
          openEvent: strings.openEvent,
          eventUrl,
        },
      }),
    },
  );

  return true;
}

export async function postActivityToEventGroup(eventId: string, text: string) {
  const event = await getEventById(eventId);
  if (!event?.telegram_chat_id) return false;

  const cleanText = text.trim().slice(0, 3500);
  if (!cleanText) return false;

  const locale = await ownerLocaleForEvent(event);
  const strings = groupT(locale);
  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);

  await sendTelegramMessage(Number(event.telegram_chat_id), cleanText, {
    message_thread_id: eventGroupThreadId(event),
    reply_markup: {
      inline_keyboard: [[{ text: strings.openEvent, url: eventUrl }]],
    },
  });

  return true;
}
