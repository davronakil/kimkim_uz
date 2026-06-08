import type { Locale } from "@/i18n/config";
import type { EventPaymentMode } from "@/types";

const labels = {
  en: {
    brand: "KimKim.uz",
    tagline: "Plan · Invite · Split",
    date: "When",
    location: "Where",
    payment: {
      free: "Free event",
      split: "Split the bill",
      pay_yourself: "Pay for yourself",
      paid: "Paid event",
    } satisfies Record<EventPaymentMode, string>,
  },
  uz: {
    brand: "KimKim.uz",
    tagline: "Reja · Taklif · Bo'lish",
    date: "Qachon",
    location: "Qayerda",
    payment: {
      free: "Bepul",
      split: "Hisobni bo'lish",
      pay_yourself: "O'zing to'la",
      paid: "Pullik",
    },
  },
  ru: {
    brand: "KimKim.uz",
    tagline: "План · Приглашение · Расходы",
    date: "Когда",
    location: "Где",
    payment: {
      free: "Бесплатно",
      split: "Делим счёт",
      pay_yourself: "Каждый платит сам",
      paid: "Платное",
    },
  },
} as const;

export function ogCardLabels(locale: Locale) {
  return labels[locale] ?? labels.en;
}
