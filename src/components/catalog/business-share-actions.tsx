"use client";

import { Check, Copy, Send, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buildShareMessage, buildTelegramShareUrl } from "@/lib/auth/telegram";

type BusinessShareActionsProps = {
  listingName: string;
};

export function BusinessShareActions({ listingName }: BusinessShareActionsProps) {
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

  return (
    <div className="flex flex-wrap gap-2">
      {canNativeShare ? (
        <button type="button" onClick={() => void nativeShare()} className="kk-btn-secondary">
          <Share2 className="h-4 w-4" />
          {common("share")}
        </button>
      ) : null}
      <button type="button" onClick={() => void copyLink()} className="kk-btn-secondary">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("linkCopied") : t("copyLink")}
      </button>
      <a href={telegramShare} target="_blank" rel="noreferrer" className="kk-btn-secondary">
        <Send className="h-4 w-4" />
        {t("shareTelegram")}
      </a>
    </div>
  );
}
