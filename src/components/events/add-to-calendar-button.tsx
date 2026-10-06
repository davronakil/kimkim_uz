"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";

type AddToCalendarButtonProps = {
  eventId: string;
  className?: string;
};

export function AddToCalendarButton({ eventId, className }: AddToCalendarButtonProps) {
  const t = useTranslations("events");

  return (
    <a
      href={`/api/events/${eventId}/calendar`}
      download
      title={t("addToCalendar")}
      aria-label={t("addToCalendar")}
      className={
        className ??
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-700 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
      }
    >
      <CalendarPlus className="h-4 w-4" />
    </a>
  );
}
