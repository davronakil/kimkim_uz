import { getEnv, getMediaBucket, runInBackground } from "@/lib/cloudflare";
import { albumPlanForEvent } from "@/lib/album/limits";
import { addEventAlbumPhoto } from "@/lib/album/store";
import type { AlbumUploadError } from "@/lib/album/store";
import { countAlbumPhotos, listAlbumPhotos } from "@/lib/db/album-queries";
import { getEventById, getEventByTelegramGroupId, isEventMember, listUserEvents } from "@/lib/db/queries";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import {
  downloadTelegramFile,
  prepareTelegramPhoto,
  sendTelegramPhotoBatch,
} from "@/lib/telegram/files";
import { groupT } from "@/lib/telegram/group";
import { t } from "@/lib/telegram/i18n";
import { albumEventPickerKeyboard } from "@/lib/telegram/keyboards";
import { notifyAlbumPhotosAdded } from "@/lib/telegram/notifications";
import {
  clearBotSession,
  readAlbumSessionData,
  upsertBotSession,
} from "@/lib/telegram/sessions";
import type { BotLocale, BotSession, TelegramMessage } from "@/lib/telegram/types";
import type { User } from "@/types";

const PAST_WINDOW_MS = 120 * 24 * 60 * 60 * 1000;

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function albumErrorText(locale: BotLocale, error: AlbumUploadError, limit: number) {
  const strings = t(locale);
  if (error === "album_full") return strings.albumFull(limit);
  if (error === "video_unavailable") return strings.albumVideoLater;
  if (error === "too_large") return strings.albumTooLarge;
  if (error === "unreadable") return strings.albumUnreadable;
  return strings.albumNotImage;
}

export function parseAlbumStartParam(startParam: string | null) {
  if (!startParam) return null;
  const match = startParam.match(/^album_([A-Za-z0-9_-]{8,32})$/);
  return match?.[1] ?? null;
}

async function albumEvents(userId: string) {
  const events = await listUserEvents(userId);
  const now = Date.now();
  return events
    .filter((event) => new Date(event.starts_at).getTime() >= now - PAST_WINDOW_MS)
    .sort((a, b) => {
      const aTime = new Date(a.starts_at).getTime();
      const bTime = new Date(b.starts_at).getTime();
      const aUpcoming = aTime >= now;
      const bUpcoming = bTime >= now;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? aTime - bTime : bTime - aTime;
    })
    .slice(0, 8);
}

function largestPhotoId(message: TelegramMessage) {
  const photo = message.photo;
  if (!photo?.length) return null;
  return photo[photo.length - 1]?.file_id ?? null;
}

function imageDocumentId(message: TelegramMessage) {
  const document = message.document;
  if (!document?.mime_type?.startsWith("image/")) return null;
  return document.file_id;
}

export async function startAlbumFlow(chatId: number, user: User, locale: BotLocale) {
  const events = await albumEvents(user.id);
  const strings = t(locale);
  if (events.length === 0) {
    await sendTelegramMessage(chatId, strings.albumNoEvents);
    return;
  }
  if (events.length === 1) {
    await beginAlbumCollect(chatId, user, locale, events[0]!.id);
    return;
  }

  await sendTelegramMessage(chatId, strings.albumPickEvent, {
    reply_markup: albumEventPickerKeyboard(events.map((event) => ({ id: event.id, title: event.title }))),
  });
}

export async function beginAlbumCollect(
  chatId: number,
  user: User,
  locale: BotLocale,
  eventId: string,
) {
  const strings = t(locale);
  const event = await getEventById(eventId);
  if (!event) {
    await sendTelegramMessage(chatId, strings.inviteNotFound);
    return;
  }
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    await sendTelegramMessage(chatId, strings.albumNotMember);
    return;
  }

  const count = await countAlbumPhotos(eventId);
  const limit = albumPlanForEvent(eventId).maxPhotos;
  const safeTitle = escapeHtml(event.title);

  if (count >= limit) {
    await clearBotSession(chatId);
    await sendTelegramMessage(chatId, strings.albumFull(limit), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: strings.albumSaveOthers, callback_data: `albdl:${eventId}` }],
          [{ text: strings.openEvent, url: buildAppUrl(`/${locale}/events/${eventId}`) }],
        ],
      },
    });
    return;
  }

  await upsertBotSession({
    chatId,
    userId: user.id,
    flow: "album",
    step: "collect",
    data: { eventId, added: 0 },
    locale,
  });

  await sendTelegramMessage(chatId, strings.albumPrompt(safeTitle, count, limit), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: strings.albumSaveOthers, callback_data: `albdl:${eventId}` }],
        [{ text: strings.openEvent, url: buildAppUrl(`/${locale}/events/${eventId}`) }],
      ],
    },
  });
}

export async function finishAlbumSession(
  chatId: number,
  user: User,
  locale: BotLocale,
  eventId: string,
  added: number,
) {
  await clearBotSession(chatId);
  const strings = t(locale);
  if (added < 1) {
    await sendTelegramMessage(chatId, strings.albumDoneEmpty);
    return;
  }

  await sendTelegramMessage(chatId, strings.albumDone(added), {
    reply_markup: {
      inline_keyboard: [
        [{ text: strings.albumSaveOthers, callback_data: `albdl:${eventId}` }],
        [{ text: strings.openEvent, url: buildAppUrl(`/${locale}/events/${eventId}`) }],
      ],
    },
  });

  void runInBackground(
    notifyAlbumPhotosAdded({
      eventId,
      author: user,
      count: added,
    }),
  );
}

export async function handleAlbumMessage(
  chatId: number,
  user: User,
  session: BotSession,
  message: TelegramMessage,
) {
  const locale = session.locale;
  const strings = t(locale);
  const data = readAlbumSessionData(session);
  const eventId = data.eventId;
  if (!eventId) {
    await clearBotSession(chatId);
    await sendTelegramMessage(chatId, strings.albumNeedCommand);
    return;
  }

  const text = message.text?.trim() ?? "";
  if (/^\/done(?:@\w+)?$/i.test(text) || /^done$/i.test(text)) {
    await finishAlbumSession(chatId, user, locale, eventId, data.added ?? 0);
    return;
  }

  if (message.video || message.video_note) {
    await sendTelegramMessage(chatId, strings.albumVideoLater);
    return;
  }

  const document = message.document;
  if (document?.mime_type?.startsWith("video/")) {
    await sendTelegramMessage(chatId, strings.albumVideoLater);
    return;
  }

  const fileId = largestPhotoId(message) ?? imageDocumentId(message);
  if (!fileId) {
    await sendTelegramMessage(chatId, document ? strings.albumNotImage : strings.albumSendMore);
    return;
  }

  const bytes = await downloadTelegramFile(fileId);
  if (!bytes) {
    await sendTelegramMessage(chatId, strings.albumTooLarge);
    return;
  }

  const limit = albumPlanForEvent(eventId).maxPhotos;
  const result = await addEventAlbumPhoto({
    eventId,
    user,
    bytes,
    source: "telegram",
    optimized: false,
  });

  if (!result.ok) {
    await sendTelegramMessage(chatId, albumErrorText(locale, result.error, limit));
    if (result.error === "album_full") await clearBotSession(chatId);
    return;
  }

  const added = (data.added ?? 0) + 1;
  await upsertBotSession({
    chatId,
    userId: user.id,
    flow: "album",
    step: "collect",
    data: { eventId, added },
    locale,
  });
  await sendTelegramMessage(chatId, strings.albumAdded(result.count, result.limit));
}

export async function sendOthersAlbumPhotos(
  chatId: number,
  user: User,
  locale: BotLocale,
  eventId: string,
) {
  const strings = t(locale);
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    await sendTelegramMessage(chatId, strings.albumNotMember);
    return;
  }

  const event = await getEventById(eventId);
  const photos = (await listAlbumPhotos(eventId)).filter((photo) => photo.user_id !== user.id);
  if (photos.length === 0) {
    await sendTelegramMessage(chatId, strings.albumSaveEmpty);
    return;
  }

  await sendTelegramMessage(chatId, strings.albumSaveSending(photos.length));
  const media = await getMediaBucket();
  const caption = event ? strings.albumSaveCaption(escapeHtml(event.title)) : undefined;

  try {
    for (let index = 0; index < photos.length; index += 10) {
      const slice = photos.slice(index, index + 10);
      const files = [];
      for (const photo of slice) {
        const object = await media.get(photo.storage_key);
        if (!object) continue;
        const bytes = await object.arrayBuffer();
        files.push(await prepareTelegramPhoto(bytes, photo.mime_type));
      }
      await sendTelegramPhotoBatch(chatId, files, index === 0 ? caption : undefined);
      if (index + 10 < photos.length) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  } catch (error) {
    console.error("Album delivery failed:", error);
    await sendTelegramMessage(chatId, strings.albumSaveFailed);
  }
}

export async function sendGroupAlbumStatus(
  chatId: number,
  locale: BotLocale,
  messageThreadId?: number | null,
) {
  const strings = groupT(locale);
  const event = await getEventByTelegramGroupId(String(chatId), messageThreadId);
  if (!event) {
    await sendTelegramMessage(chatId, strings.noEvent, {
      message_thread_id: messageThreadId ?? undefined,
    });
    return;
  }

  const count = await countAlbumPhotos(event.id);
  const limit = albumPlanForEvent(event.id).maxPhotos;
  const env = await getEnv();
  const bot = env.TELEGRAM_BOT_USERNAME || env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "kimkimuzbot";
  const url = `https://t.me/${bot}?start=album_${event.id}`;

  await sendTelegramMessage(chatId, strings.albumStatus(escapeHtml(event.title), count, limit), {
    parse_mode: "HTML",
    message_thread_id: messageThreadId ?? undefined,
    reply_markup: {
      inline_keyboard: [[{ text: strings.albumAdd, url }]],
    },
  });
}
