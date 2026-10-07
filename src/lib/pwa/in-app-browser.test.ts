import assert from "node:assert/strict";
import { detectInAppBrowser, type InAppBrowserSignals } from "./in-app-browser";

function signals(
  userAgent: string,
  extras: Partial<InAppBrowserSignals> = {},
): InAppBrowserSignals {
  return {
    userAgent,
    platform: extras.platform ?? "",
    maxTouchPoints: extras.maxTouchPoints ?? 0,
    navigatorStandalone: extras.navigatorStandalone ?? false,
  };
}

const iphone = { platform: "iPhone", maxTouchPoints: 5 } as const;
const android = { platform: "Linux armv8l", maxTouchPoints: 5 } as const;

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneChrome =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1";
const iphoneFirefox =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/604.1";
const iphoneInstagram =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0";
/** Telegram for iOS: a WKWebView user agent with no app token and no Safari token. */
const iphoneWebView =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ipadWebView =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const androidChrome =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const androidWebView =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36";
const androidInstagram =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0";
const androidTelegram =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.0";
const macSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const desktopChrome =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

// Real browsers are left alone.
assert.equal(detectInAppBrowser(signals(iphoneSafari, iphone)), null);
assert.equal(detectInAppBrowser(signals(iphoneChrome, iphone)), null);
assert.equal(detectInAppBrowser(signals(iphoneFirefox, iphone)), null);
assert.equal(detectInAppBrowser(signals(androidChrome, android)), null);
assert.equal(detectInAppBrowser(signals(macSafari, { platform: "MacIntel" })), null);
assert.equal(detectInAppBrowser(signals(desktopChrome)), null);

// Hosts that announce themselves.
assert.equal(detectInAppBrowser(signals(iphoneInstagram, iphone)), "ios");
assert.equal(detectInAppBrowser(signals(androidInstagram, android)), "android");
assert.equal(detectInAppBrowser(signals(androidTelegram, android)), "android");
assert.equal(detectInAppBrowser(signals(androidWebView, android)), "android");

// Silent WKWebView hosts, which is how Telegram for iOS arrives.
assert.equal(detectInAppBrowser(signals(iphoneWebView, iphone)), "ios");
assert.equal(detectInAppBrowser(signals(ipadWebView, iphone)), "ios");

// A home-screen PWA sends the same user agent as a WKWebView host.
assert.equal(
  detectInAppBrowser(signals(iphoneWebView, { ...iphone, navigatorStandalone: true })),
  null,
);

console.log("in-app-browser tests passed");
