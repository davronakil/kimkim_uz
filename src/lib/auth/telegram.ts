import { createHash, createHmac } from "crypto";
import type { TelegramLoginPayload } from "@/types";

function buildDataCheckString(data: Record<string, string>): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
}

export function verifyTelegramLogin(
  payload: TelegramLoginPayload,
  botToken: string,
  maxAgeSeconds = 86400,
): boolean {
  const { hash, ...rest } = payload;
  const authDate = Number(rest.auth_date);
  if (!authDate || Number.isNaN(authDate)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSeconds) return false;

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined && value !== null && value !== "") {
      fields[key] = String(value);
    }
  }

  const secretKey = createHash("sha256").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey)
    .update(buildDataCheckString(fields))
    .digest("hex");

  return computedHash === hash;
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
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
  if (!authDate || Number.isNaN(authDate)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSeconds) return null;

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = createHmac("sha256", secretKey)
    .update(buildDataCheckString(data))
    .digest("hex");

  if (computedHash !== hash) return null;
  return data;
}

export function buildTelegramShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildTelegramDeepLink(botUsername: string, startParam: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(startParam)}`;
}
