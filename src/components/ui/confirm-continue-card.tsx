"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

type ConfirmContinueCardProps = {
  title: string;
  description: string;
  pending?: boolean;
  message?: string | null;
  onConfirm: () => void;
};

/**
 * Gate for links that can only be redeemed once. Nothing is spent until the
 * visitor taps continue, so link previews and in-app browser prefetches cannot
 * burn the link before the person holding it arrives.
 */
export function ConfirmContinueCard({
  title,
  description,
  pending = false,
  message,
  onConfirm,
}: ConfirmContinueCardProps) {
  const t = useTranslations("linkGate");

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
        {description}
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="kk-btn-primary mt-6 w-full disabled:opacity-60"
      >
        {pending ? t("working") : t("continue")}
      </button>
      {message ? (
        <p className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          {message}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t("hint")}</p>
    </div>
  );
}
