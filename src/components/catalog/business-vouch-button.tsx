"use client";

import { ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

type BusinessVouchButtonProps = {
  listingId: string;
  initialCount: number;
  initialVouched: boolean;
  loggedIn: boolean;
  isOwner: boolean;
  compact?: boolean;
};

export function BusinessVouchButton({
  listingId,
  initialCount,
  initialVouched,
  loggedIn,
  isOwner,
  compact = false,
}: BusinessVouchButtonProps) {
  const t = useTranslations("catalog.vouch");
  const [count, setCount] = useState(initialCount);
  const [vouched, setVouched] = useState(initialVouched);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVouch() {
    if (!loggedIn || isOwner || busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/catalog/${listingId}/vouch`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as {
        vouched?: boolean;
        count?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? t("error"));
        return;
      }

      setVouched(Boolean(data.vouched));
      setCount(data.count ?? count);
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const label = t("count", { count });

  if (!loggedIn) {
    return (
      <div className={compact ? "inline-flex items-center gap-1.5 text-sm text-zinc-500" : "space-y-2"}>
        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <ThumbsUp className="h-4 w-4" />
          {label}
        </span>
        {!compact ? (
          <p className="text-sm text-zinc-500">
            {t("signInPrompt")}{" "}
            <Link href="/login" className="font-medium text-emerald-600 hover:underline">
              {t("signInAction")}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
        <ThumbsUp className="h-4 w-4" />
        {label}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      <button
        type="button"
        onClick={() => void toggleVouch()}
        disabled={busy}
        aria-pressed={vouched}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
          vouched
            ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${vouched ? "fill-current" : ""}`} />
        {vouched ? t("vouched") : t("vouch")}
        <span className="text-zinc-500">· {count}</span>
      </button>
      {!compact ? <p className="text-sm text-zinc-500">{t("hint")}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
