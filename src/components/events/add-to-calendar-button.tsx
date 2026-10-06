"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { downloadEventIcs, type CalendarEventInput } from "@/lib/events/calendar";

type AddToCalendarButtonProps = {
  event: Omit<CalendarEventInput, "url">;
  /** Locale-prefixed path, e.g. `/uz/events/abc`. */
  path?: string;
  className?: string;
};

export function AddToCalendarButton({ event, path, className }: AddToCalendarButtonProps) {
  const t = useTranslations("events");

  function onAdd() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://kimkim.uz";
    downloadEventIcs({
      ...event,
      url: path ? `${origin}${path}` : typeof window !== "undefined" ? window.location.href : null,
    });
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      title={t("addToCalendar")}
      aria-label={t("addToCalendar")}
      className={
        className ??
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-700 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
      }
    >
      <CalendarPlus className="h-4 w-4" />
    </button>
  );
}
