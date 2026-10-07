/** Browser-only helpers for telling Telegram's surfaces apart. */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
    /**
     * Injected by Telegram's Mini App container before any page script runs.
     * `telegram-web-app.js` uses it for the same purpose.
     */
    TelegramWebviewProxy?: unknown;
  }
}

export function telegramWebApp() {
  return window.Telegram?.WebApp;
}

/**
 * A Mini App is a first-class surface, not something to nag the visitor out of.
 *
 * The container proxy is checked first because it is the only Mini App signal
 * available on iOS before the SDK loads: Telegram for iOS leaves no user-agent
 * token, and `initData` only appears once `telegram-web-app.js` has run.
 */
export function isTelegramMiniApp() {
  if (typeof window.TelegramWebviewProxy !== "undefined") return true;
  const initData = telegramWebApp()?.initData;
  return typeof initData === "string" && initData.length > 0;
}

/**
 * True while a Telegram client is still injecting the SDK, when a Mini App is
 * indistinguishable from the in-app browser. Callers should retry rather than
 * decide.
 */
export function isTelegramShellLoading() {
  return /Telegram/i.test(navigator.userAgent) && !window.Telegram?.WebApp;
}
