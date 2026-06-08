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
import { resolveUserLocale } from "@/lib/locale";
import type { BotLocale } from "@/lib/telegram/types";
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

const groupStrings = {
  en: {
    linked: (title: string) =>
      `✅ This group is now linked to <b>${title}</b>. I'll post joins, schedule changes, and reminders here.`,
    linkFailed: "Could not link this group. Check the invite code and try again.",
    notOwner: "Only the event organizer can link a group.",
    unlinked: "Group disconnected from KimKim.",
    notLinked: "This group isn't linked to an event. Organizer: add the bot, then send /link INVITE_CODE",
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
    linkFailed: "Не удалось привязать группу. Проверьте код приглашения и попробуйте снова.",
    notOwner: "Только организатор может привязать группу.",
    unlinked: "Группа отключена от KimKim.",
    notLinked: "Группа не привязана к событию. Организатор: добавьте бота и отправьте /link INVITE_CODE",
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
    linkFailed: "Ulanmadi. Invite kodini tekshirib qayta urinib ko'ring.",
    notOwner: "Faqat event organizatori guruhni ulashi mumkin.",
    unlinked: "Guruh KimKim dan uzildi.",
    notLinked: "Guruh eventga ulanmagan. Organizator: botni qo'shing, keyin /link INVITE_CODE yuboring",
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

export function formatEventWhen(iso: string, locale: BotLocale) {
  return new Date(iso).toLocaleString(
    locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tashkent",
    },
  );
}

export async function linkGroupToEvent({
  chatId,
  inviteCode,
  telegramUserId,
  locale,
}: {
  chatId: number;
  inviteCode: string;
  telegramUserId: string;
  locale: BotLocale;
}) {
  const strings = groupT(locale);
  const event = await getEventByInviteCode(inviteCode);

  if (!event) {
    await sendTelegramMessage(chatId, strings.linkFailed);
    return { ok: false as const };
  }

  const isOwner = await isEventOwnerByTelegramId(event.id, telegramUserId);
  if (!isOwner) {
    await sendTelegramMessage(chatId, strings.notOwner);
    return { ok: false as const };
  }

  await setEventTelegramGroup(event.id, String(chatId));

  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);
  const inviteStrings = botStrings(locale);

  await sendTelegramMessage(chatId, strings.linked(event.title), {
    parse_mode: "HTML",
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
}: {
  chatId: number;
  telegramUserId: string;
  locale: BotLocale;
}) {
  const strings = groupT(locale);
  const linked = await getEventByTelegramGroupId(String(chatId));

  if (!linked) {
    await sendTelegramMessage(chatId, strings.notLinked);
    return;
  }

  const isOwner = await isEventOwnerByTelegramId(linked.id, telegramUserId);
  if (!isOwner) {
    await sendTelegramMessage(chatId, strings.notOwner);
    return;
  }

  await clearEventTelegramGroup(linked.id);
  await sendTelegramMessage(chatId, strings.unlinked);
}

export async function sendLinkedEventInfo(chatId: number, locale: BotLocale) {
  const strings = groupT(locale);
  const event = await getEventByTelegramGroupId(String(chatId));

  if (!event) {
    await sendTelegramMessage(chatId, strings.noEvent);
    return;
  }

  const when = formatEventWhen(event.starts_at, locale);
  const url = buildAppUrl(`/${locale}/events/${event.id}`);
  await sendTelegramMessage(chatId, strings.eventInfo(event.title, when, url), {
    parse_mode: "HTML",
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
  const when = formatEventWhen(event.starts_at, locale);

  const inviteStrings = botStrings(locale);
  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);

  await sendTelegramMessage(
    Number(event.telegram_chat_id),
    `${strings.shareIntro(event.title)}\n${when}`,
    {
      parse_mode: "HTML",
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
