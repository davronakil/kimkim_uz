import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");

  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white/50 py-6 pb-safe dark:border-zinc-800 dark:bg-zinc-950/50 sm:pb-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-3 md:hidden">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {common("language")}
          </p>
          <LocaleSwitcher variant="compact" className="w-full" />
        </div>
        <p className="text-center text-base text-zinc-500 sm:text-sm">{t("madeIn")}</p>
      </div>
    </footer>
  );
}
