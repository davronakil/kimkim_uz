"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

export function TelegramNotifyBanner({ botUsername }: { botUsername: string }) {
  const t = useTranslations("events.notifications");

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5 dark:border-sky-900 dark:bg-sky-950">
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" />
      <div className="space-y-3">
        <p className="text-base leading-relaxed text-sky-950 sm:text-sm dark:text-sky-100">
          {t("enableHint")}
        </p>
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noreferrer"
          className="kk-btn inline-flex min-h-11 bg-sky-600 px-5 text-white hover:bg-sky-700"
        >
          {t("openBot")}
        </a>
      </div>
    </div>
  );
}
