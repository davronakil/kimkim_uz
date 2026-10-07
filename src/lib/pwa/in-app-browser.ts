import { isIosDevice, type ClientInstallSignals } from "@/lib/pwa/install-platform";

export type InAppBrowserPlatform = "ios" | "android" | "other";

/**
 * iOS standalone PWAs and iOS in-app browsers send the same user agent, so the
 * caller has to supply `navigator.standalone` to tell them apart.
 */
export type InAppBrowserSignals = ClientInstallSignals & {
  navigatorStandalone: boolean;
};

const IN_APP_HOST =
  /Instagram|FBAN|FBAV|FB_IAB|FB4A|Line\/|Twitter|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Pinterest|WhatsApp|Telegram|MicroMessenger|GSA\//i;

const ANDROID_WEBVIEW = /;\s*wv\)/i;

/** Every dedicated iOS browser keeps a Safari token; WKWebView hosts drop it. */
const IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Safari\//i;

function platformOf(signals: InAppBrowserSignals): InAppBrowserPlatform {
  if (isIosDevice(signals)) return "ios";
  if (/Android/i.test(signals.userAgent)) return "android";
  return "other";
}

/**
 * Detects that the page is running inside another app's embedded browser, where
 * sign-in round trips and one-time links are unreliable. Returns the platform so
 * the caller can name the right escape affordance, or null in a real browser.
 */
export function detectInAppBrowser(signals: InAppBrowserSignals): InAppBrowserPlatform | null {
  const { userAgent } = signals;
  const platform = platformOf(signals);

  if (IN_APP_HOST.test(userAgent)) return platform;
  if (platform === "android" && ANDROID_WEBVIEW.test(userAgent)) return platform;

  // Telegram for iOS leaves no app token behind, so the only signal left is the
  // WKWebView shape: a mobile build that dropped the Safari token. A home-screen
  // PWA looks identical, hence the standalone guard.
  if (
    platform === "ios" &&
    !signals.navigatorStandalone &&
    /Mobile\//i.test(userAgent) &&
    !IOS_BROWSER.test(userAgent)
  ) {
    return platform;
  }

  return null;
}
