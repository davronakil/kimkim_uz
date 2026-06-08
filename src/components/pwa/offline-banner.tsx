"use client";

import { WifiOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

export function OfflineBanner({ cachedAt }: { cachedAt?: number }) {
  const t = useTranslations("pwa");
  const format = useFormatter();

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base text-amber-950 sm:text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">{t("offlineTitle")}</p>
        <p className="mt-1 opacity-90">{t("offlineBody")}</p>
        {cachedAt ? (
          <p className="mt-1 text-xs opacity-75">
            {t("offlineCachedAt", {
              time: format.dateTime(new Date(cachedAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
