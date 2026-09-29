"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function RerunEventButton({ eventId }: { eventId: string }) {
  const t = useTranslations("events.rerun");
  const common = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function rerun() {
    if (submitting) return;
    setSubmitting(true);
    setError(false);

    const response = await fetch(`/api/events/${eventId}/rerun`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(true);
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/events/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void rerun()}
        disabled={submitting}
        className="kk-btn-secondary shrink-0 px-3"
      >
        <RotateCcw className="h-4 w-4" />
        {submitting ? common("loading") : t("button")}
      </button>
      {error ? <p className="text-xs text-red-600">{t("error")}</p> : null}
    </div>
  );
}
