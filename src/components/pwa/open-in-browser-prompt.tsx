"use client";

import { Check, Compass, Copy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import {
  detectInAppBrowser,
  type InAppBrowserPlatform,
} from "@/lib/pwa/in-app-browser";
import { isInstalledDisplayMode } from "@/lib/pwa/install-platform";
import { isTelegramMiniApp, isTelegramShellLoading } from "@/lib/pwa/telegram-webview";

const STORAGE_KEY = "kimkim:in-app-hint-until";
const SHOW_DELAY_MS = 1800;
const TELEGRAM_RETRY_MS = 300;
const TELEGRAM_RETRY_LIMIT = 8;
const SNOOZE_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const COPIED_RESET_MS = 2500;

const hintKey = {
  ios: "browserHintIos",
  android: "browserHintAndroid",
  other: "browserHintOther",
} as const satisfies Record<InAppBrowserPlatform, string>;

function isSnoozed() {
  try {
    const until = Number(localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function snooze(ms: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + ms));
  } catch {
    // Private mode can reject storage writes. The card still closes for this visit.
  }
}

function isNavigatorStandalone() {
  return "standalone" in navigator && navigator.standalone === true;
}

function currentPlatform(): InAppBrowserPlatform | null {
  if (isInstalledDisplayMode(window.matchMedia.bind(window), isNavigatorStandalone())) return null;
  return detectInAppBrowser({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    navigatorStandalone: isNavigatorStandalone(),
  });
}

/** Embedded webviews often block the async clipboard, so fall back to a selection copy. */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path below.
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/**
 * Nudges visitors out of another app's embedded browser, where the Telegram
 * sign-in round trip and one-time payment links are unreliable. Telegram Mini
 * Apps are exempt: that webview is a supported surface.
 */
export function OpenInBrowserPrompt() {
  const t = useTranslations("pwa");
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InAppBrowserPlatform | null>(null);
  const [telegramTicks, setTelegramTicks] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (isSnoozed() || isTelegramMiniApp()) {
      setPlatform(null);
      return;
    }
    if (isTelegramShellLoading() && telegramTicks < TELEGRAM_RETRY_LIMIT) {
      const timer = window.setTimeout(
        () => setTelegramTicks((value) => value + 1),
        TELEGRAM_RETRY_MS,
      );
      return () => window.clearTimeout(timer);
    }

    setPlatform(currentPlatform());
  }, [ready, telegramTicks]);

  useEffect(() => {
    if (!platform) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "calc(9.5rem + env(safe-area-inset-bottom))";

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      snooze(SNOOZE_DISMISS_MS);
      setPlatform(null);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.paddingBottom = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [platform]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function dismiss() {
    snooze(SNOOZE_DISMISS_MS);
    setPlatform(null);
  }

  async function copyLink() {
    setCopied(await copyToClipboard(window.location.href));
  }

  if (!platform) return null;

  return (
    <aside
      aria-labelledby={titleId}
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-30 mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0"
    >
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg shadow-zinc-900/10 dark:border-emerald-900 dark:bg-zinc-900 dark:shadow-black/40">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Compass className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p id={titleId} className="font-semibold leading-snug">
                {t("browserTitle")}
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t("browserDismiss")}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {t("browserBody")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <PlatformHint platform={platform} />
            </p>
            <button type="button" onClick={() => void copyLink()} className="kk-btn-secondary mt-3">
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  {t("browserCopied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  {t("browserCopy")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PlatformHint({ platform }: { platform: InAppBrowserPlatform }) {
  const t = useTranslations("pwa");

  if (platform !== "ios") return t(hintKey[platform]);

  return t.rich(hintKey.ios, {
    safari: (chunks) => (
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 align-middle text-[13px] font-medium text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700">
        <Compass className="h-3.5 w-3.5" aria-hidden />
        {chunks}
      </span>
    ),
  });
}
