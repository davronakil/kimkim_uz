"use client";

import { Check, Copy, Megaphone, Unlink, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buildStartGroupLink } from "@/lib/telegram/group";

export function TelegramGroupPanel({
  eventId,
  inviteCode,
  botUsername,
  linked,
}: {
  eventId: string;
  inviteCode: string;
  botUsername: string;
  linked: boolean;
}) {
  const t = useTranslations("events.telegramGroup");
  const common = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isLinked, setIsLinked] = useState(linked);

  const linkCommand = `/link ${inviteCode}`;
  const addToGroupUrl = buildStartGroupLink(botUsername, inviteCode);

  async function copyCommand() {
    await navigator.clipboard.writeText(linkCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function unlinkGroup() {
    setUnlinking(true);
    const response = await fetch(`/api/events/${eventId}/telegram-group`, {
      method: "DELETE",
    });
    setUnlinking(false);
    if (response.ok) {
      setIsLinked(false);
    }
  }

  async function shareToGroup() {
    setSharing(true);
    await fetch(`/api/events/${eventId}/telegram-group`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share" }),
    });
    setSharing(false);
  }

  return (
    <section id="telegram-group" className="kk-card scroll-mt-24 space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="kk-section-title">{t("title")}</h3>
          <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">{t("subtitle")}</p>
        </div>
      </div>

      {isLinked ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{t("linked")}</p>
          <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">{t("linkedHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={sharing}
              onClick={() => void shareToGroup()}
              className="kk-btn-primary inline-flex min-h-11 gap-2"
            >
              <Megaphone className="h-4 w-4" />
              {sharing ? common("loading") : t("shareToGroup")}
            </button>
            <button
              type="button"
              disabled={unlinking}
              onClick={() => void unlinkGroup()}
              className="kk-btn-secondary inline-flex min-h-11 gap-2 text-red-600 dark:text-red-400"
            >
              <Unlink className="h-4 w-4" />
              {unlinking ? common("loading") : t("unlink")}
            </button>
          </div>
        </div>
      ) : (
        <ol className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          <li className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="font-semibold">1.</span> {t("step1")}
          </li>
          <li className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="font-semibold">2.</span> {t("step2")}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="kk-input flex-1 bg-white font-mono text-sm dark:bg-zinc-900">
                {linkCommand}
              </code>
              <button type="button" onClick={() => void copyCommand()} className="kk-btn-secondary gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("copied") : t("copyCommand")}
              </button>
            </div>
          </li>
        </ol>
      )}

      <a
        href={addToGroupUrl}
        target="_blank"
        rel="noreferrer"
        className="kk-btn-secondary inline-flex w-full min-h-11 justify-center sm:w-auto"
      >
        {t("addBotToGroup")}
      </a>
    </section>
  );
}
