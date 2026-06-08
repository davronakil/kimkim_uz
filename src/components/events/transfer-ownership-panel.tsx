"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import type { EventMember } from "@/types";
import { displayName } from "@/lib/utils";

export function TransferOwnershipPanel({
  eventId,
  members,
  currentUserId,
}: {
  eventId: string;
  members: EventMember[];
  currentUserId: string;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const router = useRouter();
  const candidates = members.filter(
    (member) => member.id !== currentUserId && member.role !== "owner",
  );
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (candidates.length === 0) return null;

  async function onTransfer() {
    if (!targetId) return;
    setSubmitting(true);

    const response = await fetch(`/api/events/${eventId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: targetId }),
    });

    setSubmitting(false);

    if (response.ok) {
      router.refresh();
      setConfirming(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950 sm:p-6">
      <h3 className="text-lg font-semibold text-amber-950 sm:text-base sm:font-medium dark:text-amber-100">
        {t("transferTitle")}
      </h3>
      <p className="mt-2 text-base text-amber-900/80 sm:text-sm dark:text-amber-100/80">
        {t("transferHint")}
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 min-h-11 text-base font-medium text-amber-800 underline sm:text-sm dark:text-amber-200"
        >
          {t("transferAction")}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="kk-input border-amber-200 bg-white dark:border-amber-800 dark:bg-zinc-950"
          >
            {candidates.map((member) => (
              <option key={member.id} value={member.id}>
                {displayName(member)}
              </option>
            ))}
          </select>
          <p className="text-base text-amber-900 sm:text-sm dark:text-amber-100">
            {t("transferConfirm")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void onTransfer()}
              disabled={submitting || !targetId}
              className="kk-btn min-h-12 bg-amber-700 text-white hover:bg-amber-800"
            >
              {submitting ? common("loading") : t("transferAction")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="kk-btn-secondary border-amber-300 dark:border-amber-800"
            >
              {common("cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
