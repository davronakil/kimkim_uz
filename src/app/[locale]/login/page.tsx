import { getTranslations, setRequestLocale } from "next-intl/server";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";

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
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-base leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-300">
          {t("subtitle")}
        </p>
      </div>
      <TelegramLoginButton botUsername={botUsername} />
      <p className="text-center text-xs text-zinc-500">{t("telegramHint")}</p>
    </div>
  );
}
