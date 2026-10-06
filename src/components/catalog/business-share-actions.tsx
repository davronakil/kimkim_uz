"use client";

import { Check, Copy, Send, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buildShareMessage, buildTelegramShareUrl } from "@/lib/auth/telegram";

type BusinessShareActionsProps = {
  listingName: string;
  variant?: "default" | "compact";
};

export function BusinessShareActions({
  listingName,
  variant = "default",
}: BusinessShareActionsProps) {
  const t = useTranslations("catalog");
  const common = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const shareMessage = t("shareText", { name: listingName });
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const telegramShare = pageUrl ? buildTelegramShareUrl(pageUrl, shareMessage) : "#";
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    if (!pageUrl) return;
    await navigator.clipboard.writeText(buildShareMessage(shareMessage, pageUrl));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (!pageUrl || !canNativeShare) return;
    try {
      await navigator.share({
        title: listingName,
        text: shareMessage,
        url: pageUrl,
      });
    } catch {
      // User dismissed the share sheet.
    }
  }

  const buttonClass =
    variant === "compact"
      ? "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:flex-none"
      : "kk-btn-secondary";

  return (
    <div className="flex flex-wrap gap-2">
      {canNativeShare ? (
        <button type="button" onClick={() => void nativeShare()} className={buttonClass}>
          <Share2 className="h-4 w-4" />
          {common("share")}
        </button>
      ) : null}
      <button type="button" onClick={() => void copyLink()} className={buttonClass}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("linkCopied") : t("copyLink")}
      </button>
      <a href={telegramShare} target="_blank" rel="noreferrer" className={buttonClass}>
        <Send className="h-4 w-4" />
        {t("shareTelegram")}
      </a>
    </div>
  );
}
