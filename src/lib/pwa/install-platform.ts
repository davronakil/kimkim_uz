export type ManualInstallHint =
  | "ios-safari"
  | "ios-chrome"
  | "ios-firefox"
  | "ios-other"
  | "android-firefox"
  | "mac-safari";

export type InstallHint = ManualInstallHint | "native";

export type ClientInstallSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

const INSTALLED_DISPLAY_MODES = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];

/**
 * iPadOS 13+ sends a Macintosh user agent. A multi-touch Macintosh is an iPad;
 * a Mac trackpad reports zero touch points.
 */
export function isIosDevice(signals: ClientInstallSignals): boolean {
  if (/iPad|iPhone|iPod/i.test(signals.userAgent)) return true;
  if (signals.maxTouchPoints < 2) return false;
  if (!/Macintosh/i.test(signals.userAgent)) return false;
  return signals.platform === "MacIntel" || signals.platform === "";
}

export function isInstalledDisplayMode(
  matchMedia: (query: string) => { matches: boolean },
  navigatorStandalone: boolean,
): boolean {
  if (navigatorStandalone) return true;
  return INSTALLED_DISPLAY_MODES.some((mode) => matchMedia(`(display-mode: ${mode})`).matches);
}

/**
 * Browsers that cannot open the install dialog. Chromium is omitted on purpose:
 * it exposes `beforeinstallprompt` instead of a manual hint.
 *
 * Rule out in-app browsers with `detectInAppBrowser` first — there is no install
 * path out of an embedded webview, so those visitors get the open-in-browser
 * notice instead and the hint returned here would be wrong for them.
 */
export function detectManualInstallHint(signals: ClientInstallSignals): ManualInstallHint | null {
  const { userAgent } = signals;
  const ios = isIosDevice(signals);

  if (ios) {
    if (/CriOS/i.test(userAgent)) return "ios-chrome";
    if (/FxiOS/i.test(userAgent)) return "ios-firefox";
    if (/EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)) return "ios-other";
    if (/Safari/i.test(userAgent)) return "ios-safari";
    return "ios-other";
  }

  if (/Android/i.test(userAgent) && /Firefox\//i.test(userAgent)) return "android-firefox";

  if (
    /Macintosh/i.test(userAgent) &&
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|Edg\/|OPR\/|Firefox\//i.test(userAgent)
  ) {
    return "mac-safari";
  }

  return null;
}
