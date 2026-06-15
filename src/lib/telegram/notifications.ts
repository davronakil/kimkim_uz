import { getDb } from "@/lib/cloudflare";
import { getEventById, listEventMembers } from "@/lib/db/queries";
import { formatLocaleDateTime, intlLocale, resolveUserLocale } from "@/lib/locale";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import { notifyEventGroup, ownerLocaleForEvent } from "@/lib/telegram/group";
import { t } from "@/lib/telegram/i18n";
import type { BotLocale } from "@/lib/telegram/types";
import type { Event, EventRsvpStatus, User } from "@/types";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function truncate(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function displayName(user: Pick<User, "first_name" | "last_name" | "username">): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username || "Someone";
}

function localeFor(user: Pick<User, "language_code">): BotLocale {
  return resolveUserLocale(user);
}

function eventUrl(eventId: string, locale: BotLocale): string {
  return buildAppUrl(`/${locale}/events/${eventId}`);
}

function openEventButton(eventId: string, locale: BotLocale) {
  return {
    parse_mode: "HTML" as const,
    reply_markup: {
      inline_keyboard: [[{ text: t(locale).openEvent, url: eventUrl(eventId, locale) }]],
    },
  };
}

const changeLabels = {
  en: { title: "title", time: "date/time", location: "location", description: "description" },
  uz: { title: "nomi", time: "vaqt", location: "joy", description: "qisqacha" },
  ru: { title: "название", time: "дата/время", location: "место", description: "описание" },
} as const;

const rsvpLabels: Record<BotLocale, Record<EventRsvpStatus, string>> = {
  en: { going: "going", maybe: "maybe", declined: "can't go" },
  uz: { going: "keladi", maybe: "balki", declined: "kela olmaydi" },
  ru: { going: "придёт", maybe: "возможно", declined: "не сможет" },
};

function rsvpGuestCountLabel(locale: BotLocale, count: number): string {
  if (locale === "uz") {
    return count === 0 ? "Qo'shimcha mehmon yo'q." : `+${count} qo'shimcha mehmon bilan.`;
  }
  if (locale === "ru") {
    return count === 0
      ? "Без дополнительных гостей."
      : `Берёт с собой ещё ${count}.`;
  }
  return count === 0
    ? "No extra guests."
    : `Bringing ${count} extra ${count === 1 ? "guest" : "guests"}.`;
}

async function listNotifiableMembers(
  eventId: string,
  excludeUserId?: string,
  activityOnly = false,
): Promise<User[]> {
  const members = await listEventMembers(eventId);
  if (!activityOnly) {
    return members.filter(
      (member) => member.telegram_chat_id && member.id !== excludeUserId,
    );
  }

  const db = await getDb();
  const prefs = await db
    .prepare(
      `SELECT user_id, mode FROM event_notification_preferences WHERE event_id = ?`,
    )
    .bind(eventId)
    .all<{ user_id: string; mode: "instant" | "digest" | "muted" }>();
  const modeByUser = new Map((prefs.results ?? []).map((pref) => [pref.user_id, pref.mode]));

  return members.filter((member) => {
    if (!member.telegram_chat_id || member.id === excludeUserId) return false;
    return (modeByUser.get(member.id) ?? "instant") === "instant";
  });
}

async function notifyMembers(
  eventId: string,
  excludeUserId: string | undefined,
  buildMessage: (locale: BotLocale, event: Event) => string,
) {
  const event = await getEventById(eventId);
  if (!event) return;

  const members = await listNotifiableMembers(eventId, excludeUserId, true);

  await Promise.allSettled(
    members.map(async (member) => {
      const locale = localeFor(member);
      const text = buildMessage(locale, event);
      await sendTelegramMessage(member.telegram_chat_id!, text, openEventButton(eventId, locale));
    }),
  );
}

export async function notifyNewComment(input: {
  eventId: string;
  author: Pick<User, "first_name" | "last_name" | "username">;
  body: string;
  parentId: string | null;
  authorUserId: string;
}) {
  const authorName = escapeHtml(displayName(input.author));
  const preview = escapeHtml(truncate(input.body));

  const buildComment = (locale: BotLocale, event: Event) => {
    const title = escapeHtml(event.title);
    if (input.parentId) {
      if (locale === "uz") {
        return `💬 <b>${authorName}</b> <b>${title}</b> ichida javob yozdi:\n"${preview}"`;
      }
      if (locale === "ru") {
        return `💬 <b>${authorName}</b> ответил(а) в <b>${title}</b>:\n"${preview}"`;
      }
      return `💬 <b>${authorName}</b> replied in <b>${title}</b>:\n"${preview}"`;
    }
    if (locale === "uz") {
      return `💬 <b>${authorName}</b> <b>${title}</b> ga yozdi:\n"${preview}"`;
    }
    if (locale === "ru") {
      return `💬 <b>${authorName}</b> прокомментировал(а) <b>${title}</b>:\n"${preview}"`;
    }
    return `💬 <b>${authorName}</b> commented on <b>${title}</b>:\n"${preview}"`;
  };

  await notifyMembers(input.eventId, input.authorUserId, buildComment);

  await notifyEventGroup(input.eventId, buildComment, (locale, event) => [
    { text: t(locale).openEvent, url: eventUrl(event.id, locale) },
  ]);
}

export async function notifyNewExpense(input: {
  eventId: string;
  author: Pick<User, "first_name" | "last_name" | "username">;
  description: string;
  amountLabel: string;
  authorUserId: string;
}) {
  const authorName = escapeHtml(displayName(input.author));
  const description = escapeHtml(truncate(input.description, 80));
  const amount = escapeHtml(input.amountLabel);

  const buildExpense = (locale: BotLocale, event: Event) => {
    const title = escapeHtml(event.title);
    if (locale === "uz") {
      return `💰 <b>${authorName}</b> <b>${title}</b> ga xarajat qo'shdi: ${description} — ${amount}`;
    }
    if (locale === "ru") {
      return `💰 <b>${authorName}</b> добавил(а) расход в <b>${title}</b>: ${description} — ${amount}`;
    }
    return `💰 <b>${authorName}</b> added an expense to <b>${title}</b>: ${description} — ${amount}`;
  };

  await notifyMembers(input.eventId, input.authorUserId, buildExpense);

  await notifyEventGroup(input.eventId, buildExpense, (locale, event) => [
    { text: t(locale).openEvent, url: eventUrl(event.id, locale) },
  ]);
}

export async function notifyEventUpdated(input: {
  eventId: string;
  editorUserId: string;
  editor: Pick<User, "first_name" | "last_name" | "username">;
  changes: Array<"title" | "time" | "location" | "description">;
}) {
  if (input.changes.length === 0) return;

  const editorName = escapeHtml(displayName(input.editor));

  const buildUpdate = (locale: BotLocale, event: Event) => {
    const title = escapeHtml(event.title);
    const labels = changeLabels[locale];
    const summary = input.changes.map((change) => labels[change]).join(", ");
    if (locale === "uz") {
      return `📅 <b>${editorName}</b> <b>${title}</b> ni yangiladi: ${summary}.`;
    }
    if (locale === "ru") {
      return `📅 <b>${editorName}</b> обновил(а) <b>${title}</b>: ${summary}.`;
    }
    return `📅 <b>${editorName}</b> updated <b>${title}</b>: ${summary}.`;
  };

  await notifyMembers(input.eventId, input.editorUserId, buildUpdate);

  await notifyEventGroup(input.eventId, buildUpdate, (locale, event) => [
    { text: t(locale).openEvent, url: eventUrl(event.id, locale) },
  ]);
}

export async function notifyMemberJoined(input: {
  eventId: string;
  member: Pick<User, "first_name" | "last_name" | "username">;
  memberUserId: string;
}) {
  const memberName = escapeHtml(displayName(input.member));

  const buildJoin = (locale: BotLocale, event: Event) => {
    const title = escapeHtml(event.title);
    if (locale === "uz") {
      return `👋 <b>${memberName}</b> <b>${title}</b> ga qo'shildi.`;
    }
    if (locale === "ru") {
      return `👋 <b>${memberName}</b> присоединился(ась) к <b>${title}</b>.`;
    }
    return `👋 <b>${memberName}</b> joined <b>${title}</b>.`;
  };

  await notifyMembers(input.eventId, input.memberUserId, buildJoin);

  await notifyEventGroup(input.eventId, buildJoin);
}

export async function notifyRsvpChanged(input: {
  eventId: string;
  member: Pick<User, "first_name" | "last_name" | "username">;
  memberUserId: string;
  status: EventRsvpStatus;
  additionalGuestCount?: number;
  guestCountChanged?: boolean;
}) {
  const memberName = escapeHtml(displayName(input.member));

  const buildRsvp = (locale: BotLocale, event: Event) => {
    const title = escapeHtml(event.title);
    const status = escapeHtml(rsvpLabels[locale][input.status]);
    const guestCount = input.additionalGuestCount ?? 0;
    const guestText =
      input.status !== "declined" && (input.guestCountChanged || guestCount > 0)
        ? ` ${escapeHtml(rsvpGuestCountLabel(locale, guestCount))}`
        : "";
    if (locale === "uz") {
      return `📝 <b>${memberName}</b> <b>${title}</b> uchun RSVP holatini o'zgartirdi: <b>${status}</b>.${guestText}`;
    }
    if (locale === "ru") {
      return `📝 <b>${memberName}</b> обновил(а) RSVP для <b>${title}</b>: <b>${status}</b>.${guestText}`;
    }
    return `📝 <b>${memberName}</b> updated RSVP for <b>${title}</b>: <b>${status}</b>.${guestText}`;
  };

  await notifyMembers(input.eventId, input.memberUserId, buildRsvp);

  await notifyEventGroup(input.eventId, buildRsvp, (locale, event) => [
    { text: t(locale).openEvent, url: eventUrl(event.id, locale) },
  ]);
}

function reminderText(locale: BotLocale, title: string, timeLabel: string, window: "24h" | "1h") {
  if (window === "24h") {
    if (locale === "uz") {
      return `⏰ <b>${title}</b> 24 soatdan keyin boshlanadi (${escapeHtml(timeLabel)}).`;
    }
    if (locale === "ru") {
      return `⏰ <b>${title}</b> начнётся примерно через 24 часа (${escapeHtml(timeLabel)}).`;
    }
    return `⏰ <b>${title}</b> starts in about 24 hours (${escapeHtml(timeLabel)}).`;
  }
  if (locale === "uz") {
    return `⏰ <b>${title}</b> 1 soatdan keyin boshlanadi (${escapeHtml(timeLabel)}).`;
  }
  if (locale === "ru") {
    return `⏰ <b>${title}</b> начнётся примерно через 1 час (${escapeHtml(timeLabel)}).`;
  }
  return `⏰ <b>${title}</b> starts in about 1 hour (${escapeHtml(timeLabel)}).`;
}

export async function processEventReminders() {
  const db = await getDb();

  const windows = [
    { type: "24h" as const, minOffset: "+23 hours", maxOffset: "+25 hours" },
    { type: "1h" as const, minOffset: "+45 minutes", maxOffset: "+75 minutes" },
  ];

  for (const window of windows) {
    const events = await db
      .prepare(
        `SELECT * FROM events
         WHERE starts_at > datetime('now', ?)
           AND starts_at <= datetime('now', ?)`,
      )
      .bind(window.minOffset, window.maxOffset)
      .all<Event>();

    for (const event of events.results ?? []) {
      if (event.telegram_chat_id) {
        const groupAlreadySent = await db
          .prepare(
            `SELECT 1 FROM event_group_reminder_logs
             WHERE event_id = ? AND reminder_type = ?`,
          )
          .bind(event.id, window.type)
          .first();

        if (!groupAlreadySent) {
          const groupLocale = await ownerLocaleForEvent(event);
          const title = escapeHtml(event.title);
          const timeLabel = formatLocaleDateTime(new Date(event.starts_at), groupLocale, {
            dateStyle: "medium",
            timeStyle: "short",
          });
          const groupText = reminderText(groupLocale, title, timeLabel, window.type);

          try {
            await sendTelegramMessage(
              Number(event.telegram_chat_id),
              groupText,
              openEventButton(event.id, groupLocale),
            );
            await db
              .prepare(
                `INSERT INTO event_group_reminder_logs (event_id, reminder_type)
                 VALUES (?, ?)`,
              )
              .bind(event.id, window.type)
              .run();
          } catch (groupError) {
            console.error("Group reminder failed:", groupError);
          }
        }
      }

      const members = await listNotifiableMembers(event.id);

      for (const member of members) {
        const alreadySent = await db
          .prepare(
            `SELECT 1 FROM event_reminder_logs
             WHERE event_id = ? AND user_id = ? AND reminder_type = ?`,
          )
          .bind(event.id, member.id, window.type)
          .first();

        if (alreadySent) continue;

        const locale = localeFor(member);
        const title = escapeHtml(event.title);
        const timeLabel = new Date(event.starts_at).toLocaleString(intlLocale(locale), {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const text = reminderText(locale, title, timeLabel, window.type);

        try {
          await sendTelegramMessage(
            member.telegram_chat_id!,
            text,
            openEventButton(event.id, locale),
          );

          await db
            .prepare(
              `INSERT INTO event_reminder_logs (event_id, user_id, reminder_type)
               VALUES (?, ?, ?)`,
            )
            .bind(event.id, member.id, window.type)
            .run();
        } catch (error) {
          console.error("Event reminder failed:", error);
        }
      }
    }
  }
}

function digestText({
  locale,
  title,
  commentCount,
  expenseCount,
}: {
  locale: BotLocale;
  title: string;
  commentCount: number;
  expenseCount: number;
}) {
  const safeTitle = escapeHtml(title);
  if (locale === "uz") {
    return `🧾 <b>${safeTitle}</b> bo'yicha qisqa xulosa:\n💬 Izohlar: ${commentCount}\n💰 Xarajatlar: ${expenseCount}`;
  }
  if (locale === "ru") {
    return `🧾 Краткая сводка по <b>${safeTitle}</b>:\n💬 Комментарии: ${commentCount}\n💰 Расходы: ${expenseCount}`;
  }
  return `🧾 Digest for <b>${safeTitle}</b>:\n💬 Comments: ${commentCount}\n💰 Expenses: ${expenseCount}`;
}

export async function processEventDigests() {
  const db = await getDb();
  const prefs = await db
    .prepare(
      `SELECT p.event_id, p.user_id, p.last_digest_at, e.title, u.telegram_chat_id,
              u.first_name, u.last_name, u.username, u.language_code
       FROM event_notification_preferences p
       JOIN events e ON e.id = p.event_id
       JOIN users u ON u.id = p.user_id
       JOIN event_members em ON em.event_id = p.event_id AND em.user_id = p.user_id
       WHERE p.mode = 'digest' AND u.telegram_chat_id IS NOT NULL`,
    )
    .all<
      {
        event_id: string;
        user_id: string;
        last_digest_at: string | null;
        title: string;
        telegram_chat_id: string;
      } & Pick<User, "first_name" | "last_name" | "username" | "language_code">
    >();

  for (const pref of prefs.results ?? []) {
    const since =
      pref.last_digest_at ??
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const counts = await db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM comments WHERE event_id = ? AND created_at > ? AND user_id != ?) AS comment_count,
           (SELECT COUNT(*) FROM expenses WHERE event_id = ? AND created_at > ? AND payer_id != ?) AS expense_count`,
      )
      .bind(pref.event_id, since, pref.user_id, pref.event_id, since, pref.user_id)
      .first<{ comment_count: number; expense_count: number }>();

    const commentCount = counts?.comment_count ?? 0;
    const expenseCount = counts?.expense_count ?? 0;

    if (commentCount === 0 && expenseCount === 0) {
      await db
        .prepare(
          `UPDATE event_notification_preferences
           SET last_digest_at = datetime('now'), updated_at = datetime('now')
           WHERE event_id = ? AND user_id = ?`,
        )
        .bind(pref.event_id, pref.user_id)
        .run();
      continue;
    }

    const locale = localeFor(pref);
    try {
      await sendTelegramMessage(
        pref.telegram_chat_id,
        digestText({ locale, title: pref.title, commentCount, expenseCount }),
        openEventButton(pref.event_id, locale),
      );
      await db
        .prepare(
          `UPDATE event_notification_preferences
           SET last_digest_at = datetime('now'), updated_at = datetime('now')
           WHERE event_id = ? AND user_id = ?`,
        )
        .bind(pref.event_id, pref.user_id)
        .run();
    } catch (error) {
      console.error("Event digest failed:", error);
    }
  }
}
