import assert from "node:assert/strict";
import { detectManualInstallHint, isInstalledDisplayMode, type ClientInstallSignals } from "./install-platform";

function signals(
  userAgent: string,
  extras: Partial<ClientInstallSignals> = {},
): ClientInstallSignals {
  return {
    userAgent,
    platform: extras.platform ?? "",
    maxTouchPoints: extras.maxTouchPoints ?? 0,
  };
}

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneChrome =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1";
const iphoneFirefox =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/604.1";
const iphoneEdge =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/129.0.2792.84 Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneInstagram =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0";
const ipadSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const macSafari = ipadSafari;
const androidChrome =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const androidFirefox = "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0";
const androidInstagram =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0";
const androidWebView =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36";
const desktopChrome =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const desktopEdge =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0";

assert.equal(detectManualInstallHint(signals(iphoneSafari, { platform: "iPhone", maxTouchPoints: 5 })), "ios-safari");
assert.equal(detectManualInstallHint(signals(iphoneChrome, { platform: "iPhone", maxTouchPoints: 5 })), "ios-chrome");
assert.equal(detectManualInstallHint(signals(iphoneFirefox, { platform: "iPhone", maxTouchPoints: 5 })), "ios-firefox");
assert.equal(detectManualInstallHint(signals(iphoneEdge, { platform: "iPhone", maxTouchPoints: 5 })), "ios-other");
assert.equal(
  detectManualInstallHint(signals(iphoneInstagram, { platform: "iPhone", maxTouchPoints: 5 })),
  "ios-in-app",
);
assert.equal(
  detectManualInstallHint(signals(ipadSafari, { platform: "MacIntel", maxTouchPoints: 5 })),
  "ios-safari",
);
assert.equal(
  detectManualInstallHint(signals(macSafari, { platform: "MacIntel", maxTouchPoints: 0 })),
  "mac-safari",
);
assert.equal(detectManualInstallHint(signals(androidChrome, { platform: "Linux armv8l", maxTouchPoints: 5 })), null);
assert.equal(detectManualInstallHint(signals(androidFirefox, { maxTouchPoints: 5 })), "android-firefox");
assert.equal(detectManualInstallHint(signals(androidInstagram, { maxTouchPoints: 5 })), "android-in-app");
assert.equal(detectManualInstallHint(signals(androidWebView, { maxTouchPoints: 5 })), "android-in-app");
assert.equal(detectManualInstallHint(signals(desktopChrome)), null);
assert.equal(detectManualInstallHint(signals(desktopEdge)), null);

assert.equal(
  isInstalledDisplayMode((query) => ({ matches: query === "(display-mode: standalone)" }), false),
  true,
);
assert.equal(
  isInstalledDisplayMode(() => ({ matches: false }), true),
  true,
);
assert.equal(
  isInstalledDisplayMode(() => ({ matches: false }), false),
  false,
);

console.log("install-platform tests passed");
