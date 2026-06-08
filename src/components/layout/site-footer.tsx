import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="mt-auto border-t border-zinc-200/80 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
      <p>{t("madeIn")}</p>
    </footer>
  );
}
