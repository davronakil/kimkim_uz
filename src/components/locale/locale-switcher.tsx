"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeFlags, localeNames, localeShort, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
  variant?: "flags" | "compact";
};

export function LocaleSwitcher({ className, variant = "flags" }: LocaleSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  function switchLocale(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex w-full rounded-full border border-zinc-200 p-1 dark:border-zinc-700", className)}>
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            aria-label={`${t("language")}: ${localeNames[code]}`}
            aria-pressed={locale === code}
            onClick={() => switchLocale(code)}
            className={cn(
              "min-h-11 flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition touch-manipulation active:scale-[0.98]",
              locale === code
                ? "bg-emerald-500 text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
            )}
          >
            {localeFlags[code]} {localeShort[code]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("language")}
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          title={localeNames[code]}
          aria-label={`${t("language")}: ${localeNames[code]}`}
          aria-pressed={locale === code}
          onClick={() => switchLocale(code)}
          className={cn(
            "flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-xl transition active:scale-95 sm:h-9 sm:w-9 sm:text-lg",
            locale === code
              ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-950"
              : "opacity-60 hover:bg-zinc-100 hover:opacity-100 dark:hover:bg-zinc-800",
          )}
        >
          <span aria-hidden>{localeFlags[code]}</span>
        </button>
      ))}
    </div>
  );
}
