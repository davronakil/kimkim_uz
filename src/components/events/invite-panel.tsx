"use client";

import { Check, Copy, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buildTelegramDeepLink, buildTelegramShareUrl } from "@/lib/auth/telegram";

export function InvitePanel({
  eventId,
  eventTitle,
  inviteCode: initialInviteCode,
  botUsername,
  locale,
  canRegenerate = false,
}: {
  eventId: string;
  eventTitle: string;
  inviteCode: string;
  botUsername: string;
  locale: string;
  canRegenerate?: boolean;
}) {
  const t = useTranslations("events.invite");
  const common = useTranslations("common");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const invitePath = `/${locale}/join/${inviteCode}`;
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${invitePath}`
      : `https://kimkim.uz${invitePath}`;

  const telegramShare = buildTelegramShareUrl(
    t("shareText", { title: eventTitle }),
    inviteUrl,
  );
  const telegramBotLink = buildTelegramDeepLink(botUsername, `join_${inviteCode}`);

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateLink(eventId: string) {
    setRegenerating(true);
    const response = await fetch(`/api/events/${eventId}/invite`, { method: "POST" });
    setRegenerating(false);
    setShowRegenerateConfirm(false);

    if (response.ok) {
      const data = (await response.json()) as { invite_code: string };
      setInviteCode(data.invite_code);
    }
  }

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div>
        <h3 className="kk-section-title">{t("title")}</h3>
        <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <input readOnly value={inviteUrl} className="kk-input bg-zinc-50 text-sm dark:bg-zinc-950" />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="kk-btn-secondary w-full"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <a href={telegramShare} target="_blank" rel="noreferrer" className="kk-btn-primary w-full">
          <Send className="h-4 w-4" />
          {t("shareTelegram")}
        </a>
        <a
          href={telegramBotLink}
          target="_blank"
          rel="noreferrer"
          className="kk-btn-secondary w-full"
        >
          {t("openInBot")}
        </a>
      </div>

      {canRegenerate ? (
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {!showRegenerateConfirm ? (
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="min-h-11 text-base font-medium text-amber-700 hover:underline sm:text-sm dark:text-amber-300"
            >
              {t("regenerate")}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-base text-zinc-600 sm:text-sm dark:text-zinc-300">
                {t("regenerateConfirm")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void regenerateLink(eventId)}
                  disabled={regenerating}
                  className="kk-btn min-h-12 bg-amber-600 text-white hover:bg-amber-700"
                >
                  {regenerating ? common("loading") : t("regenerate")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegenerateConfirm(false)}
                  className="kk-btn-secondary"
                >
                  {common("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
