"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

export function LeaveEventButton({ eventId }: { eventId: string }) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function onLeave() {
    setLeaving(true);
    const response = await fetch(`/api/events/${eventId}/leave`, { method: "POST" });
    setLeaving(false);

    if (response.ok) {
      router.push("/events");
      router.refresh();
      return;
    }

    setConfirming(false);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="kk-btn-secondary w-full sm:w-auto"
      >
        <LogOut className="h-4 w-4" />
        {t("leaveEvent")}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <p className="text-base text-zinc-600 sm:text-sm dark:text-zinc-300">{t("leaveConfirm")}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving}
          className="kk-btn min-h-12 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {leaving ? common("loading") : t("leaveEvent")}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="kk-btn-secondary">
          {common("cancel")}
        </button>
      </div>
    </div>
  );
}
