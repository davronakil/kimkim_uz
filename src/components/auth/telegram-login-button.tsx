"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    onTelegramAuth?: (user: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
    }) => void;
  }
}

type TelegramLoginButtonProps = {
  botUsername: string;
  redirectTo?: string;
};

export function TelegramLoginButton({
  botUsername,
  redirectTo = "/events",
}: TelegramLoginButtonProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common");

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...user,
          id: String(user.id),
          auth_date: String(user.auth_date),
        }),
      });

      if (response.ok) {
        window.dispatchEvent(new Event("kimkim:auth-change"));
        router.refresh();
        router.push(redirectTo);
      }
    };

    const container = document.getElementById("telegram-login");
    if (!container || container.childElementCount > 0) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, locale, redirectTo, router]);

  return (
    <div className="space-y-3">
      <div id="telegram-login" className="flex justify-center" />
      <p className="text-center text-sm text-zinc-500">{t("loading")}</p>
    </div>
  );
}
