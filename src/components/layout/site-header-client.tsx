"use client";

import { CalendarDays, CalendarPlus, LogOut, Menu, Plus, Shield, Store, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";
import { displayName } from "@/lib/utils";

type AuthUser = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
};

export function SiteHeaderClient({
  appName,
  initialUser,
}: {
  appName: string;
  initialUser: AuthUser | null;
}) {
  const t = useTranslations("common");
  const catalog = useTranslations("catalog");
  const discover = useTranslations("discover");
  const admin = useTranslations("admin");
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled) return;
      if (response.ok) {
        const data = (await response.json()) as { user: AuthUser };
        setUser(data.user);
        const adminResponse = await fetch("/api/admin/me", { credentials: "include" });
        if (adminResponse.ok) {
          const adminData = (await adminResponse.json()) as { admin: boolean };
          setIsAdmin(adminData.admin);
        } else {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    }

    void syncAuth();
    const onAuthChange = () => void syncAuth();
    window.addEventListener("kimkim:auth-change", onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener("kimkim:auth-change", onAuthChange);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setMenuOpen(false);
    window.dispatchEvent(new Event("kimkim:auth-change"));
    router.refresh();
    router.push("/");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 pt-safe backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <Link
            href="/"
            className="flex min-w-0 touch-manipulation items-center gap-2.5 font-semibold tracking-tight"
          >
            <Image
              src="/kimkim-app-icon.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm shadow-emerald-500/25 sm:h-8 sm:w-8"
            />
            <span className="truncate text-base sm:text-sm">{appName}</span>
          </Link>

          {/* Desktop */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/catalog"
              className="rounded-full px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {catalog("title")}
            </Link>
            <Link
              href="/discover"
              className="rounded-full px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {discover("title")}
            </Link>
            {user ? (
              <>
                <Link
                  href="/events"
                  className="rounded-full px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  {t("myEvents")}
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-full px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    {admin("nav")}
                  </Link>
                ) : null}
                <Link href="/events/new" className="kk-btn-primary">
                  <Plus className="h-4 w-4" />
                  {t("createEvent")}
                </Link>
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 py-1 pl-1 pr-3 dark:border-zinc-700">
                  {user.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photo_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
                      {user.first_name[0]}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate text-sm text-zinc-600 dark:text-zinc-300">
                    {displayName(user)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label={t("signOut")}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link href="/login" className="kk-btn-primary">
                {t("signIn")}
              </Link>
            )}
            <LocaleSwitcher variant="flags" className="ml-1" />
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Link
                href="/events/new"
                className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 active:scale-95"
                aria-label={t("createEvent")}
              >
                <Plus className="h-5 w-5" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-zinc-200 text-zinc-700 active:scale-95 dark:border-zinc-700 dark:text-zinc-200"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <nav className="absolute right-0 top-0 flex h-full w-[min(100%,22rem)] flex-col bg-white pt-safe shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
              {user ? (
                <div className="flex min-w-0 items-center gap-3">
                  {user.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {user.first_name[0]}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{displayName(user)}</p>
                    {user.username ? (
                      <p className="truncate text-sm text-zinc-500">@{user.username}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-base font-semibold">{appName}</p>
              )}
              <button
                type="button"
                onClick={closeMenu}
                className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <Link
                href="/catalog"
                onClick={closeMenu}
                className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <Store className="h-5 w-5 text-emerald-500" />
                {catalog("title")}
              </Link>
              <Link
                href="/discover"
                onClick={closeMenu}
                className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <CalendarDays className="h-5 w-5 text-emerald-500" />
                {discover("title")}
              </Link>
              {user ? (
                <>
                  <Link
                    href="/events"
                    onClick={closeMenu}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <CalendarPlus className="h-5 w-5 text-emerald-500" />
                    {t("myEvents")}
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      <Shield className="h-5 w-5 text-emerald-500" />
                      {admin("nav")}
                    </Link>
                  ) : null}
                  <Link
                    href="/events/new"
                    onClick={closeMenu}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <Plus className="h-5 w-5 text-emerald-500" />
                    {t("createEvent")}
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="kk-btn-primary w-full"
                >
                  {t("signIn")}
                </Link>
              )}

              <div className="mt-4 px-1">
                <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {t("language")}
                </p>
                <LocaleSwitcher variant="compact" className="w-full justify-center" />
              </div>
            </div>

            {user ? (
              <div className="border-t border-zinc-200 p-4 pb-safe dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="kk-btn-secondary w-full"
                >
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </button>
              </div>
            ) : (
              <div className="border-t border-zinc-200 p-4 pb-safe dark:border-zinc-800" />
            )}
          </nav>
        </div>
      ) : null}
    </>
  );
}
