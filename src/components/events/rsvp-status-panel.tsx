"use client";

import { Check, HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventRsvpStatus } from "@/types";

const statuses: Array<{ value: EventRsvpStatus; icon: typeof Check }> = [
  { value: "going", icon: Check },
  { value: "maybe", icon: HelpCircle },
  { value: "declined", icon: X },
];

export function RsvpStatusPanel({
  eventId,
  initialStatus,
  onChanged,
  readOnly = false,
}: {
  eventId: string;
  initialStatus: EventRsvpStatus;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.rsvp");
  const common = useTranslations("common");
  const [status, setStatus] = useState<EventRsvpStatus>(initialStatus);
  const [savingStatus, setSavingStatus] = useState<EventRsvpStatus | null>(null);
  const [error, setError] = useState(false);

  async function updateStatus(nextStatus: EventRsvpStatus) {
    if (nextStatus === status || savingStatus || readOnly) return;

    setSavingStatus(nextStatus);
    setError(false);

    const response = await fetch(`/api/events/${eventId}/rsvp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: nextStatus }),
    });

    setSavingStatus(null);

    if (!response.ok) {
      setError(true);
      return;
    }

    setStatus(nextStatus);
    onChanged();
  }

  return (
    <section className="kk-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="kk-section-title">{t("statusTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("statusSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          {statuses.map(({ value, icon: Icon }) => {
            const active = status === value;
            const saving = savingStatus === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => void updateStatus(value)}
                disabled={readOnly || Boolean(savingStatus)}
                className={`kk-btn min-h-11 px-3 text-sm ${
                  active
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {saving ? common("loading") : t(value)}
              </button>
            );
          })}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{t("statusError")}</p> : null}
    </section>
  );
}
