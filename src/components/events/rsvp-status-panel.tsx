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
  initialAdditionalGuestCount = 0,
  onChanged,
  readOnly = false,
}: {
  eventId: string;
  initialStatus: EventRsvpStatus;
  initialAdditionalGuestCount?: number;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.rsvp");
  const common = useTranslations("common");
  const [status, setStatus] = useState<EventRsvpStatus>(initialStatus);
  const [additionalGuestCount, setAdditionalGuestCount] = useState(
    initialAdditionalGuestCount,
  );
  const [savedAdditionalGuestCount, setSavedAdditionalGuestCount] = useState(
    initialAdditionalGuestCount,
  );
  const [savingStatus, setSavingStatus] = useState<EventRsvpStatus | null>(null);
  const [savingGuests, setSavingGuests] = useState(false);
  const [error, setError] = useState(false);

  async function updateRsvp(nextStatus: EventRsvpStatus, nextGuestCount = additionalGuestCount) {
    const normalizedGuestCount = nextStatus === "declined" ? 0 : nextGuestCount;
    if (
      (nextStatus === status && normalizedGuestCount === savedAdditionalGuestCount) ||
      savingStatus ||
      savingGuests ||
      readOnly
    ) {
      return;
    }

    setSavingStatus(nextStatus);
    setSavingGuests(nextStatus === status);
    setError(false);

    const response = await fetch(`/api/events/${eventId}/rsvp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        status: nextStatus,
        additional_guest_count: normalizedGuestCount,
      }),
    });

    setSavingStatus(null);
    setSavingGuests(false);

    if (!response.ok) {
      setError(true);
      return;
    }

    setStatus(nextStatus);
    setAdditionalGuestCount(normalizedGuestCount);
    setSavedAdditionalGuestCount(normalizedGuestCount);
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
                onClick={() => void updateRsvp(value)}
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
      {status !== "declined" ? (
        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-end dark:border-zinc-800">
          <label className="kk-label">
            {t("additionalGuestsLabel")}
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              inputMode="numeric"
              value={additionalGuestCount}
              onChange={(event) =>
                setAdditionalGuestCount(
                  Math.min(20, Math.max(0, Number(event.target.value) || 0)),
                )
              }
              disabled={readOnly || savingGuests}
              className="kk-input mt-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void updateRsvp(status)}
            disabled={readOnly || savingGuests || Boolean(savingStatus)}
            className="kk-btn-secondary min-h-11"
          >
            {savingGuests ? common("loading") : common("save")}
          </button>
          <p className="text-sm text-zinc-500 sm:col-span-2 dark:text-zinc-400">
            {t("additionalGuestsHint", { count: additionalGuestCount })}
          </p>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{t("statusError")}</p> : null}
    </section>
  );
}
