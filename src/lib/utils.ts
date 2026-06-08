import { clsx, type ClassValue } from "clsx";
import { customAlphabet } from "nanoid";
import { twMerge } from "tailwind-merge";

const inviteAlphabet = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

export function generateInviteCode() {
  return inviteAlphabet();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, currency = "UZS", locale = "en"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale === "uz" ? "uz-UZ" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(amount);
}

export function displayName(
  user: { first_name: string; last_name?: string | null; username?: string | null },
): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username || "User";
}

export function centsToMajor(cents: number): number {
  return cents / 100;
}

export function majorToCents(amount: number): number {
  return Math.round(amount * 100);
}
