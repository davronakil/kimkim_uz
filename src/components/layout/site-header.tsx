import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";
import { getCurrentUser } from "@/lib/auth/session";
import { displayName } from "@/lib/utils";

export async function SiteHeader() {
  const t = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-sm text-white">
            K
          </span>
          <span>{t("appName")}</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/events" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">
                {t("myEvents")}
              </Link>
              <Link
                href="/events/new"
                className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600"
              >
                {t("createEvent")}
              </Link>
              <span className="hidden text-zinc-500 sm:inline">{displayName(user)}</span>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600"
            >
              {t("signIn")}
            </Link>
          )}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
