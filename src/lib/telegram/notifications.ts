import { getDb } from "@/lib/cloudflare";
import { getEventById, listEventMembers } from "@/lib/db/queries";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import type { Event, User } from "@/types";

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

function localeFor(user: Pick<User, "language_code">): "en" | "uz" {
  return user.language_code === "uz" ? "uz" : "en";
}

function eventUrl(eventId: string, locale: "en" | "uz"): string {
  return buildAppUrl(`/${locale}/events/${eventId}`);
}

function openEventButton(eventId: string, locale: "en" | "uz") {
  return {
    parse_mode: "HTML" as const,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: locale === "uz" ? "Eventni ochish" : "Open event",
            url: eventUrl(eventId, locale),
          },
        ],
      ],
    },
  };
}

async function listNotifiableMembers(
  eventId: string,
  excludeUserId?: string,
): Promise<User[]> {
  const members = await listEventMembers(eventId);
  return members.filter(
    (member) => member.telegram_chat_id && member.id !== excludeUserId,
  );
}

async function notifyMembers(
  eventId: string,
  excludeUserId: string | undefined,
  buildMessage: (locale: "en" | "uz", event: Event) => string,
) {
  const event = await getEventById(eventId);
  if (!event) return;

  const members = await listNotifiableMembers(eventId, excludeUserId);

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

  await notifyMembers(input.eventId, input.authorUserId, (locale, event) => {
    const title = escapeHtml(event.title);
    if (input.parentId) {
      return locale === "uz"
        ? `💬 <b>${authorName}</b> <b>${title}</b> ichida javob yozdi:\n"${preview}"`
        : `💬 <b>${authorName}</b> replied in <b>${title}</b>:\n"${preview}"`;
    }
    return locale === "uz"
      ? `💬 <b>${authorName}</b> <b>${title}</b> ga yozdi:\n"${preview}"`
      : `💬 <b>${authorName}</b> commented on <b>${title}</b>:\n"${preview}"`;
  });
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

  await notifyMembers(input.eventId, input.authorUserId, (locale, event) => {
    const title = escapeHtml(event.title);
    return locale === "uz"
      ? `💰 <b>${authorName}</b> <b>${title}</b> ga xarajat qo'shdi: ${description} — ${amount}`
      : `💰 <b>${authorName}</b> added an expense to <b>${title}</b>: ${description} — ${amount}`;
  });
}

export async function notifyEventUpdated(input: {
  eventId: string;
  editorUserId: string;
  editor: Pick<User, "first_name" | "last_name" | "username">;
  changes: Array<"title" | "time" | "location" | "description">;
}) {
  if (input.changes.length === 0) return;

  const editorName = escapeHtml(displayName(input.editor));
  const changeLabels = {
    en: {
      title: "title",
      time: "date/time",
      location: "location",
      description: "description",
    },
    uz: {
      title: "nomi",
      time: "vaqt",
      location: "joy",
      description: "qisqacha",
    },
  } as const;

  await notifyMembers(input.eventId, input.editorUserId, (locale, event) => {
    const title = escapeHtml(event.title);
    const labels = changeLabels[locale];
    const summary = input.changes.map((change) => labels[change]).join(", ");

    return locale === "uz"
      ? `📅 <b>${editorName}</b> <b>${title}</b> ni yangiladi: ${summary}.`
      : `📅 <b>${editorName}</b> updated <b>${title}</b>: ${summary}.`;
  });
}

export async function notifyMemberJoined(input: {
  eventId: string;
  member: Pick<User, "first_name" | "last_name" | "username">;
  memberUserId: string;
}) {
  const memberName = escapeHtml(displayName(input.member));

  await notifyMembers(input.eventId, input.memberUserId, (locale, event) => {
    const title = escapeHtml(event.title);
    return locale === "uz"
      ? `👋 <b>${memberName}</b> <b>${title}</b> ga qo'shildi.`
      : `👋 <b>${memberName}</b> joined <b>${title}</b>.`;
  });
}

export async function processEventReminders() {
  const db = await getDb();

  const windows = [
    {
      type: "24h" as const,
      minOffset: "+23 hours",
      maxOffset: "+25 hours",
    },
    {
      type: "1h" as const,
      minOffset: "+45 minutes",
      maxOffset: "+75 minutes",
    },
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
        const startsAt = new Date(event.starts_at);
        const timeLabel = startsAt.toLocaleString(locale === "uz" ? "uz-UZ" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        const text =
          window.type === "24h"
            ? locale === "uz"
              ? `⏰ <b>${title}</b> 24 soatdan keyin boshlanadi (${escapeHtml(timeLabel)}).`
              : `⏰ Reminder: <b>${title}</b> starts in about 24 hours (${escapeHtml(timeLabel)}).`
            : locale === "uz"
              ? `⏰ <b>${title}</b> 1 soatdan keyin boshlanadi (${escapeHtml(timeLabel)}).`
              : `⏰ Reminder: <b>${title}</b> starts in about 1 hour (${escapeHtml(timeLabel)}).`;

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
