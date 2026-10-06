"use client";

import { Share, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import {
  detectManualInstallHint,
  isInstalledDisplayMode,
  type InstallHint,
  type ManualInstallHint,
} from "@/lib/pwa/install-platform";

const STORAGE_KEY = "kimkim:install-hint-until";
const SHOW_DELAY_MS = 1200;
const TELEGRAM_RETRY_MS = 300;
const TELEGRAM_RETRY_LIMIT = 8;
const SNOOZE_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
const SNOOZE_NATIVE_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SNOOZE_INSTALLED_MS = 365 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined" && !window.__kimkimInstallBound) {
  window.__kimkimInstallBound = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("kimkim:install-available"));
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event("kimkim:install-available"));
  });
}

declare global {
  interface Window {
    __kimkimInstallBound?: boolean;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

const manualMessageKey = {
  "ios-safari": "installIosSafari",
  "ios-chrome": "installIosChrome",
  "ios-firefox": "installIosFirefox",
  "ios-other": "installIosOther",
  "ios-in-app": "installIosInApp",
  "android-in-app": "installAndroidInApp",
  "android-firefox": "installAndroidFirefox",
  "mac-safari": "installMacSafari",
} as const;

const shareChipHints = new Set<ManualInstallHint>(["ios-safari", "ios-chrome", "mac-safari"]);

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

function isRunningInstalled() {
  return isInstalledDisplayMode(window.matchMedia.bind(window), isNavigatorStandalone());
}

function isTelegramMiniApp() {
  const initData = window.Telegram?.WebApp?.initData;
  return typeof initData === "string" && initData.length > 0;
}

function isTelegramShellLoading() {
  return /Telegram/i.test(navigator.userAgent) && !window.Telegram?.WebApp;
}

function currentHint(): InstallHint | null {
  if (deferredInstallPrompt) return "native";
  return detectManualInstallHint({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

export function InstallPrompt({ initialLoggedIn }: { initialLoggedIn: boolean }) {
  const t = useTranslations("pwa");
  const titleId = useId();
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState<InstallHint | null>(null);
  const [visible, setVisible] = useState(false);
  const [promptEpoch, setPromptEpoch] = useState(0);
  const [telegramTicks, setTelegramTicks] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!cancelled) setLoggedIn(response.ok);
    }

    void syncAuth();
    const onAuthChange = () => void syncAuth();
    window.addEventListener("kimkim:auth-change", onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener("kimkim:auth-change", onAuthChange);
    };
  }, []);

  useEffect(() => {
    const onAvailable = () => setPromptEpoch((value) => value + 1);
    const onInstalled = () => {
      snooze(SNOOZE_INSTALLED_MS);
      setVisible(false);
    };
    window.addEventListener("kimkim:install-available", onAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("kimkim:install-available", onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setVisible(false);
      return;
    }
    if (!ready) return;
    if (isSnoozed() || isRunningInstalled() || isTelegramMiniApp()) {
      setVisible(false);
      return;
    }
    if (isTelegramShellLoading()) {
      if (telegramTicks >= TELEGRAM_RETRY_LIMIT) {
        setVisible(false);
        return;
      }
      const timer = window.setTimeout(() => setTelegramTicks((value) => value + 1), TELEGRAM_RETRY_MS);
      return () => window.clearTimeout(timer);
    }

    const next = currentHint();
    setHint(next);
    setVisible(next !== null);
  }, [loggedIn, promptEpoch, ready, telegramTicks]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "calc(8.5rem + env(safe-area-inset-bottom))";

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      snooze(SNOOZE_DISMISS_MS);
      setVisible(false);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.paddingBottom = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  function dismiss() {
    snooze(SNOOZE_DISMISS_MS);
    setVisible(false);
  }

  async function install() {
    const prompt = deferredInstallPrompt;
    if (!prompt) return;
    deferredInstallPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      snooze(choice.outcome === "accepted" ? SNOOZE_INSTALLED_MS : SNOOZE_NATIVE_DISMISS_MS);
    } catch {
      snooze(SNOOZE_NATIVE_DISMISS_MS);
    }
    setVisible(false);
  }

  if (!visible || !hint) return null;

  return (
    <aside
      aria-labelledby={titleId}
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-30 mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0"
    >
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg shadow-zinc-900/10 dark:border-emerald-900 dark:bg-zinc-900 dark:shadow-black/40">
        <div className="flex gap-3">
          <Image
            src="/kimkim-app-icon.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p id={titleId} className="font-semibold leading-snug">
                {t("installTitle")}
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t("installDismiss")}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <HintCopy hint={hint} />
            </p>
            {hint === "native" ? (
              <button type="button" onClick={() => void install()} className="kk-btn-primary mt-3">
                {t("installAction")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HintCopy({ hint }: { hint: InstallHint }) {
  const t = useTranslations("pwa");

  if (hint === "native") return t("installNativeBody");

  const key = manualMessageKey[hint];
  if (!shareChipHints.has(hint)) return t(key);

  return t.rich(key, {
    share: (chunks) => (
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 align-middle text-[13px] font-medium text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700">
        <Share className="h-3.5 w-3.5" aria-hidden />
        {chunks}
      </span>
    ),
  });
}
