import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [auth, meta] = await Promise.all([
    getTranslations({ locale, namespace: "auth" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/login`,
    title: auth("title"),
    description: auth("subtitle"),
    ogTitle: meta("ogTitle"),
    robots: {
      index: false,
      follow: false,
    },
  });
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    return redirect({ href: "/events", locale });
  }

  const t = await getTranslations("auth");
  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    "your_bot_username";

  return (
    <div className="relative mx-auto max-w-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_65%)]" />
      <div className="relative space-y-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-lg sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
          <p className="text-base leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-300">
            {t("subtitle")}
          </p>
        </div>
        <TelegramLoginButton botUsername={botUsername} />
        <p className="text-center text-xs text-zinc-500">{t("telegramHint")}</p>
      </div>
    </div>
  );
}
