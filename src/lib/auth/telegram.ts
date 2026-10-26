import { createHmac } from "crypto";
import { timingSafeEqualHex } from "@/lib/security/timing-safe";

/** Mini App initData should be fresh; 24h was too long for replay. */
export const TELEGRAM_AUTH_MAX_AGE_SECONDS = 600;
const AUTH_DATE_FUTURE_SKEW_SECONDS = 60;

function buildDataCheckString(data: Record<string, string>): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
}

function isAuthDateFresh(authDate: number, maxAgeSeconds: number): boolean {
  if (!authDate || Number.isNaN(authDate)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (authDate > now + AUTH_DATE_FUTURE_SKEW_SECONDS) return false;
  if (now - authDate > maxAgeSeconds) return false;
  return true;
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = TELEGRAM_AUTH_MAX_AGE_SECONDS,
): Record<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    data[key] = value;
  });

  const authDate = Number(data.auth_date);
  if (!isAuthDateFresh(authDate, maxAgeSeconds)) return null;

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = createHmac("sha256", secretKey)
    .update(buildDataCheckString(data))
    .digest("hex");

  if (!timingSafeEqualHex(computedHash, hash)) return null;
  return data;
}

/** Share a link via Telegram. Uses percent-encoding so spaces are not sent as "+". */
export function buildTelegramShareUrl(url: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  if (!text?.trim()) {
    return `https://t.me/share/url?url=${encodedUrl}`;
  }
  return `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text.trim())}`;
}

export function buildShareMessage(text: string, url: string): string {
  return `${text.trim()}\n${url}`;
}

export function buildTelegramDeepLink(botUsername: string, startParam: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(startParam)}`;
}
