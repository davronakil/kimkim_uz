import {
  clearEventTelegramGroup,
  getEventById,
  getEventByInviteCode,
  getEventByTelegramGroupId,
  getUserById,
  isEventOwnerByTelegramId,
  setEventTelegramGroup,
} from "@/lib/db/queries";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
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

  const topicName =
    message.reply_to_message?.forum_topic_created?.name?.trim() ||
    message.forum_topic_created?.name?.trim() ||
    null;

  return { messageThreadId: threadId, topicName };
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

const groupStrings = {
  en: {
    linked: (title: string) =>
      `✅ This group is now linked to <b>${title}</b>. I'll post joins, schedule changes, and reminders here.`,
    linkedTopic: (title: string, topic: string) =>
      `✅ Linked <b>${title}</b> to topic <b>${topic}</b>. Joins, schedule changes, and reminders will land here — not in General.`,
    linkedTopicUnnamed: (title: string) =>
      `✅ Linked <b>${title}</b> to this topic. Joins, schedule changes, and reminders will land here — not in General.`,
    linkFailed: "Could not link this group. Check the invite code and try again.",
    notOwner: "Only the event organizer can link a group.",
    unlinked: "Group disconnected from KimKim.",
    notLinked: "This group isn't linked to an event. Organizer: add the bot, then send /link INVITE_CODE in the topic KimKim should use.",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "No event linked to this group.",
    openEvent: "Open event",
    joinEvent: "Join / RSVP",
    shareIntro: (title: string) => `📣 <b>${title}</b> — plan on KimKim.uz`,
  },
  ru: {
    linked: (title: string) =>
      `✅ Группа привязана к событию <b>${title}</b>. Здесь будут присоединения, изменения и напоминания.`,
    linkedTopic: (title: string, topic: string) =>
      `✅ Событие <b>${title}</b> привязано к теме <b>${topic}</b>. Сообщения будут здесь, а не в «General».`,
    linkedTopicUnnamed: (title: string) =>
      `✅ Событие <b>${title}</b> привязано к этой теме. Сообщения будут здесь, а не в «General».`,
    linkFailed: "Не удалось привязать группу. Проверьте код приглашения и попробуйте снова.",
    notOwner: "Только организатор может привязать группу.",
    unlinked: "Группа отключена от KimKim.",
    notLinked: "Группа не привязана к событию. Организатор: добавьте бота и отправьте /link INVITE_CODE в нужной теме.",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "К этой группе не привязано событие.",
    openEvent: "Открыть событие",
    joinEvent: "Присоединиться / RSVP",
    shareIntro: (title: string) => `📣 <b>${title}</b> — планируйте на KimKim.uz`,
  },
  uz: {
    linked: (title: string) =>
      `✅ Guruh <b>${title}</b> eventiga ulandi. Qo'shilishlar, o'zgarishlar va eslatmalar shu yerga keladi.`,
    linkedTopic: (title: string, topic: string) =>
      `✅ <b>${title}</b> «${topic}» mavzusiga ulandi. Xabarlar shu yerga tushadi, General ga emas.`,
    linkedTopicUnnamed: (title: string) =>
      `✅ <b>${title}</b> shu mavzuga ulandi. Xabarlar shu yerga tushadi, General ga emas.`,
    linkFailed: "Ulanmadi. Invite kodini tekshirib qayta urinib ko'ring.",
    notOwner: "Faqat event organizatori guruhni ulashi mumkin.",
    unlinked: "Guruh KimKim dan uzildi.",
    notLinked: "Guruh eventga ulanmagan. Organizator: botni qo'shing, keyin KimKim yozadigan mavzuda /link INVITE_CODE yuboring",
    eventInfo: (title: string, when: string, url: string) =>
      `📌 <b>${title}</b>\n${when}\n${url}`,
    noEvent: "Bu guruh eventga ulanmagan.",
    openEvent: "Eventni ochish",
    joinEvent: "Qo'shilish",
    shareIntro: (title: string) => `📣 <b>${title}</b> — KimKim.uz da reja`,
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
    messageThreadId != null
      ? topicName
        ? strings.linkedTopic(event.title, topicName)
        : strings.linkedTopicUnnamed(event.title)
      : strings.linked(event.title);

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

  await sendTelegramMessage(
    Number(event.telegram_chat_id),
    `${strings.shareIntro(event.title)}\n${when}`,
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
