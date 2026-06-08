"use client";

import { Bell, BellOff, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { EventNotificationMode } from "@/types";

const options: Array<{ mode: EventNotificationMode; icon: typeof Bell }> = [
  { mode: "instant", icon: Bell },
  { mode: "digest", icon: Mail },
  { mode: "muted", icon: BellOff },
];

export function NotificationPreferencesPanel({ eventId }: { eventId: string }) {
  const t = useTranslations("events.notifications");
  const [mode, setMode] = useState<EventNotificationMode>("instant");
  const [saving, setSaving] = useState<EventNotificationMode | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/events/${eventId}/notifications`, {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { mode: EventNotificationMode };
      setMode(data.mode);
    }

    void load();
  }, [eventId]);

  async function update(nextMode: EventNotificationMode) {
    setSaving(nextMode);
    const response = await fetch(`/api/events/${eventId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mode: nextMode }),
    });
    setSaving(null);
    if (response.ok) {
      setMode(nextMode);
    }
  }

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="kk-section-title">{t("title")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(({ mode: optionMode, icon: Icon }) => {
          const active = mode === optionMode;
          return (
            <button
              key={optionMode}
              type="button"
              onClick={() => void update(optionMode)}
              disabled={saving !== null}
              className={`flex min-h-24 flex-col items-start gap-2 rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/25 dark:border-emerald-600 dark:bg-emerald-950/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950"
              }`}
            >
              <Icon className={active ? "h-5 w-5 text-emerald-600" : "h-5 w-5 text-zinc-500"} />
              <span className="text-sm font-semibold">{t(`${optionMode}.title`)}</span>
              <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {saving === optionMode ? t("saving") : t(`${optionMode}.body`)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
