import type { BotLocale } from "@/lib/telegram/types";

export function guestCapLine(
  locale: BotLocale,
  goingCount: number,
  maxGuests: number | null | undefined,
): string | null {
  if (maxGuests == null || maxGuests <= 0) return null;

  if (locale === "uz") {
    return goingCount >= maxGuests
      ? `To'ldi · ${maxGuests} kishi`
      : `${goingCount} / ${maxGuests} kishi`;
  }
  if (locale === "ru") {
    return goingCount >= maxGuests
      ? `Мест нет · ${maxGuests} человек`
      : `${goingCount} из ${maxGuests} идут`;
  }
  return goingCount >= maxGuests
    ? `Full · ${maxGuests} people`
    : `${goingCount} of ${maxGuests} going`;
}
