import { createEventRecord } from "@/lib/events/create";
import { formatEventWhen, t } from "@/lib/telegram/i18n";
import { isSkipInput, parseEventDateTime } from "@/lib/telegram/parse-datetime";
import {
  clearBotSession,
  readCreateEventData,
  upsertBotSession,
} from "@/lib/telegram/sessions";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import type { BotLocale, BotSession, TelegramMessage } from "@/lib/telegram/types";
import type { User } from "@/types";

export async function startCreateEventFlow(chatId: number, user: User, locale: BotLocale) {
  await upsertBotSession({
    chatId,
    userId: user.id,
    flow: "create_event",
    step: "title",
    data: {},
    locale,
  });

  await sendTelegramMessage(chatId, t(locale).createAskTitle, { parse_mode: "HTML" });
}

function locationFromMessage(message: TelegramMessage) {
  if (message.venue?.title) {
    return {
      locationName: message.venue.title,
      locationAddress: message.venue.address ?? null,
      locationLat: message.location?.latitude ?? null,
      locationLng: message.location?.longitude ?? null,
    };
  }

  if (message.location) {
    const label =
      message.location.latitude.toFixed(5) + ", " + message.location.longitude.toFixed(5);
    return {
      locationName: label,
      locationAddress: null,
      locationLat: message.location.latitude,
      locationLng: message.location.longitude,
    };
  }

  return null;
}

async function finalizeCreateEvent(
  chatId: number,
  user: User,
  locale: BotLocale,
  data: {
    title: string;
    startsAt: string;
    description: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
  },
) {
  const strings = t(locale);
  const { eventId, inviteCode } = await createEventRecord({
    creatorId: user.id,
    title: data.title,
    description: data.description,
    startsAt: data.startsAt,
    locationName: data.locationName ?? null,
    locationLat: data.locationLat ?? null,
    locationLng: data.locationLng ?? null,
  });

  await clearBotSession(chatId);

  const when = formatEventWhen(data.startsAt, locale);
  const eventUrl = buildAppUrl(`/${locale}/events/${eventId}`);
  const inviteUrl = buildAppUrl(`/${locale}/join/${inviteCode}`);

  await sendTelegramMessage(
    chatId,
    `${strings.createSuccess(data.title, when)}${data.locationName ? `\n📍 ${data.locationName}` : ""}\n\n<code>${inviteUrl}</code>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: strings.openEvent, url: eventUrl },
            { text: strings.shareInvite, url: inviteUrl },
          ],
        ],
      },
    },
  );
}

export async function handleCreateEventStep(
  chatId: number,
  user: User,
  session: BotSession,
  text: string,
  message?: TelegramMessage,
) {
  const locale = session.locale;
  const strings = t(locale);
  const data = readCreateEventData(session);

  if (session.step === "title") {
    const title = text.trim();
    if (title.length < 2) {
      await sendTelegramMessage(chatId, strings.createTitleTooShort);
      return;
    }

    await upsertBotSession({
      chatId,
      userId: user.id,
      flow: "create_event",
      step: "datetime",
      data: { ...data, title },
      locale,
    });
    await sendTelegramMessage(chatId, strings.createAskDatetime, { parse_mode: "HTML" });
    return;
  }

  if (session.step === "datetime") {
    const startsAt = parseEventDateTime(text, locale);
    if (!startsAt) {
      await sendTelegramMessage(chatId, strings.createInvalidDatetime);
      return;
    }

    await upsertBotSession({
      chatId,
      userId: user.id,
      flow: "create_event",
      step: "description",
      data: { ...data, startsAt },
      locale,
    });
    await sendTelegramMessage(chatId, strings.createAskDescription, { parse_mode: "HTML" });
    return;
  }

  if (session.step === "description") {
    const description = isSkipInput(text) ? null : text.trim();

    await upsertBotSession({
      chatId,
      userId: user.id,
      flow: "create_event",
      step: "location",
      data: { ...data, description },
      locale,
    });
    await sendTelegramMessage(chatId, strings.createAskLocation, { parse_mode: "HTML" });
    return;
  }

  if (session.step === "location") {
    const title = data.title;
    const startsAt = data.startsAt;

    if (!title || !startsAt) {
      await clearBotSession(chatId);
      await sendTelegramMessage(chatId, strings.unknown);
      return;
    }

    const fromPin = message ? locationFromMessage(message) : null;
    if (fromPin) {
      await finalizeCreateEvent(chatId, user, locale, {
        title,
        startsAt,
        description: data.description ?? null,
        ...fromPin,
      });
      return;
    }

    if (isSkipInput(text)) {
      await finalizeCreateEvent(chatId, user, locale, {
        title,
        startsAt,
        description: data.description ?? null,
      });
      return;
    }

    const locationName = text.trim();
    if (locationName.length < 2) {
      await sendTelegramMessage(chatId, strings.createLocationTooShort);
      return;
    }

    await finalizeCreateEvent(chatId, user, locale, {
      title,
      startsAt,
      description: data.description ?? null,
      locationName,
    });
  }
}
