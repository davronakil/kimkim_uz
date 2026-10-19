"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

import { telegramWebApp } from "@/lib/pwa/telegram-webview";

async function signInWithInitData(initData: string): Promise<boolean> {
  const me = await fetchWithTimeout("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (me.ok) return false;
  if (me.status !== 401) throw new Error("Session check unavailable");

  const response = await fetchWithTimeout("/api/auth/telegram", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ initData }),
  });
  if (response.status >= 500 || response.status === 429) {
    throw new Error("Telegram sign-in temporarily unavailable");
  }
  return response.ok;
}

/** Recover startup after slow SDK loading, temporary network failures, or resume. */
export function TelegramWebAppBootstrap() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let finished = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let detachScript = () => {};

    const retry = () => {
      if (disposed || retries >= 1 || retryTimer) return;
      retries += 1;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        start();
      }, 1500);
    };

    const login = async () => {
      const webApp = telegramWebApp();
      if (disposed || inFlight || finished || !webApp) return;

      // Client bridge support varies. A failed expand must not prevent login.
      try { webApp.ready?.(); } catch { /* Continue with authentication. */ }
      try { webApp.expand?.(); } catch { /* Optional on older clients. */ }
      if (!webApp.initData) return;

      inFlight = true;
      try {
        const signedIn = await signInWithInitData(webApp.initData);
        if (disposed) return;
        finished = true;
        if (signedIn) {
          window.dispatchEvent(new Event("kimkim:auth-change"));
          router.refresh();
        }
      } catch {
        if (!disposed) {
          console.warn("Telegram startup sign-in unavailable; retrying when possible");
          retry();
        }
      } finally {
        inFlight = false;
      }
    };

    function start() {
      if (disposed || finished || inFlight) return;
      detachScript();
      if (telegramWebApp()) {
        void login();
        return;
      }

      // An existing script may still be loading (including a Strict Mode remount).
      let script = document.querySelector<HTMLScriptElement>("script[data-telegram-webapp]");
      const created = !script;
      if (!script) {
        script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-web-app.js";
        script.async = true;
        script.dataset.telegramWebapp = "1";
      }
      const target = script;
      const loaded = () => {
        detachScript();
        void login();
      };
      const failed = () => {
        detachScript();
        target.remove();
        retry();
      };
      target.addEventListener("load", loaded);
      target.addEventListener("error", failed);
      loadTimer = setTimeout(failed, 10_000);
      detachScript = () => {
        clearTimeout(loadTimer);
        target.removeEventListener("load", loaded);
        target.removeEventListener("error", failed);
      };
      if (created) document.head.appendChild(target);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") start();
    };
    start();
    window.addEventListener("online", start);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      detachScript();
      window.removeEventListener("online", start);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
