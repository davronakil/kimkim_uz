"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

async function signInWithInitData(initData: string): Promise<boolean> {
  const me = await fetch("/api/auth/me", { credentials: "include" });
  if (me.ok) return false;

  const response = await fetch("/api/auth/telegram", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ initData }),
  });

  return response.ok;
}

function tryWebAppLogin(onSignedIn: () => void) {
  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData;
  if (!initData) return;

  webApp.ready?.();
  webApp.expand?.();

  void signInWithInitData(initData).then((signedIn) => {
    if (signedIn) onSignedIn();
  });
}

/**
 * When KimKim is opened as a Telegram Mini App, sign in from initData so the
 * visitor is already authenticated without the web “Continue in Telegram” flow.
 */
export function TelegramWebAppBootstrap() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const onSignedIn = () => {
      window.dispatchEvent(new Event("kimkim:auth-change"));
      router.refresh();
    };

    const existing = document.querySelector("script[data-telegram-webapp]");
    if (existing) {
      tryWebAppLogin(onSignedIn);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.telegramWebapp = "1";
    script.onload = () => tryWebAppLogin(onSignedIn);
    document.head.appendChild(script);
  }, [router]);

  return null;
}
