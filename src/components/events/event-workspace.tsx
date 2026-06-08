"use client";

import { CalendarDays, MapPin, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { CommentThread } from "@/components/events/comment-thread";
import { ExpensePanel } from "@/components/events/expense-panel";
import type { Comment, Event, Expense, Settlement, User } from "@/types";
import { buildTelegramShareUrl } from "@/lib/auth/telegram";

type EventPayload = {
  event: Event;
  members: User[];
  comments: Comment[];
  expenses: Expense[];
  settlements: Settlement[];
};

export function EventWorkspace({
  eventId,
  locale,
  initialData,
}: {
  eventId: string;
  locale: string;
  initialData: EventPayload;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const [tab, setTab] = useState<"overview" | "comments" | "expenses">("overview");
  const [data, setData] = useState<EventPayload>(initialData);

  const load = useCallback(async () => {
    const response = await fetch(`/api/events/${eventId}`);
    if (response.ok) {
      setData(await response.json());
    }
  }, [eventId]);

  const { event, members, comments, expenses, settlements } = data;
  const startsAt = new Date(event.starts_at);
  const shareUrl =
    typeof window !== "undefined"
      ? buildTelegramShareUrl(event.title, window.location.href)
      : "#";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="aspect-[21/9] bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-950 dark:to-teal-950">
          {event.cover_image_key ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${event.cover_image_key}`}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{event.title}</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-300">{event.description}</p>
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Share2 className="h-4 w-4" />
              {common("share")}
            </a>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {startsAt.toLocaleString(locale === "uz" ? "uz-UZ" : "en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </span>
            {event.location_name ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {event.location_name}
              </span>
            ) : null}
          </div>
          {event.location_lat && event.location_lng ? (
            <iframe
              title={event.location_name ?? "Map"}
              className="h-56 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}&z=15&output=embed`}
            />
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["overview", "comments", "expenses"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === value
                ? "bg-emerald-500 text-white"
                : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-medium">{t("detailTitle")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {members.map((member) => (
              <li key={member.id}>
                {member.first_name} {member.last_name ?? ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "comments" ? (
        <CommentThread eventId={eventId} comments={comments} onPosted={load} />
      ) : null}

      {tab === "expenses" ? (
        <ExpensePanel
          eventId={eventId}
          members={members}
          expenses={expenses}
          settlements={settlements}
          locale={locale}
          onAdded={load}
        />
      ) : null}
    </div>
  );
}
