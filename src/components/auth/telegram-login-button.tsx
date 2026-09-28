"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmContinueCard } from "@/components/ui/confirm-continue-card";
import { useRouter } from "@/i18n/navigation";
import { safeRedirectPath } from "@/lib/auth/login-challenge";

type ChallengeStatus = "pending" | "ready" | "consumed" | "expired";

type TelegramLoginButtonProps = {
  botUsername: string;
  redirectTo?: string;
  verifyId?: string;
};

const STORAGE_KEY = "kimkim:login-challenge";

function TelegramMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M21.5 3.3c.3-.9-.5-1.6-1.4-1.3L2.7 8.4c-.9.3-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.8 1.3 1 1.8.4l2.6-2.6 4.5 3.3c.7.5 1.7.1 1.9-.7l2.5-14.4ZM8.4 11.7l9.2-5.6-7.2 7.8-.3 2.4-1.7-4.6Z" />
    </svg>
  );
}

function openTelegram(url: string, popup: Window | null) {
  if (popup && !popup.closed) {
    popup.location.replace(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function TelegramLoginButton({
  redirectTo = "/events",
  verifyId,
}: TelegramLoginButtonProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
  const safeRedirect = safeRedirectPath(redirectTo);
  const [phase, setPhase] = useState<"idle" | "waiting" | "ready" | "claiming" | "error">(
    verifyId ? "waiting" : "idle",
  );
  const [challengeId, setChallengeId] = useState<string | null>(verifyId ?? null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<"loginExpired" | "loginUsed" | "loginError" | null>(
    null,
  );
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const finishLogin = useCallback(
    (path: string) => {
      sessionStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event("kimkim:auth-change"));
      router.refresh();
      router.push(safeRedirectPath(path, safeRedirect));
    },
    [router, safeRedirect],
  );

  const claim = useCallback(
    async (id: string) => {
      setPhase("claiming");
      setClaimMessage(null);
      const response = await fetch("/api/auth/telegram/challenge/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        const data = (await response.json()) as { redirectTo?: string };
        finishLogin(data.redirectTo ?? safeRedirect);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { status?: ChallengeStatus };
      if (payload.status === "expired") setErrorKey("loginExpired");
      else if (payload.status === "consumed") setErrorKey("loginUsed");
      else if (payload.status === "pending") {
        setPhase("waiting");
        return;
      } else setErrorKey("loginError");
      setPhase("error");
    },
    [finishLogin, safeRedirect],
  );

  const checkStatus = useCallback(
    async (id: string, autoClaim: boolean) => {
      const response = await fetch(`/api/auth/telegram/challenge?id=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { status?: ChallengeStatus };
      if (data.status === "ready") {
        stopPolling();
        if (autoClaim && !verifyId) {
          await claim(id);
          return;
        }
        setPhase("ready");
        return;
      }
      if (data.status === "consumed") {
        stopPolling();
        setErrorKey("loginUsed");
        setPhase("error");
        return;
      }
      if (data.status === "expired") {
        stopPolling();
        sessionStorage.removeItem(STORAGE_KEY);
        setErrorKey("loginExpired");
        setPhase("error");
      }
    },
    [claim, stopPolling, verifyId],
  );

  const startPolling = useCallback(
    (id: string, autoClaim: boolean) => {
      stopPolling();
      void checkStatus(id, autoClaim);
      pollRef.current = window.setInterval(() => {
        void checkStatus(id, autoClaim);
      }, 2000);
    },
    [checkStatus, stopPolling],
  );

  useEffect(() => {
    if (verifyId) {
      setChallengeId(verifyId);
      setPhase("waiting");
      startPolling(verifyId, false);
      return () => stopPolling();
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setChallengeId(stored);
      setPhase("waiting");
      startPolling(stored, true);
    }

    return () => stopPolling();
  }, [startPolling, stopPolling, verifyId]);

  async function startTelegramLogin() {
    setPhase("waiting");
    setErrorKey(null);
    const popup = window.open("about:blank", "_blank");
    try {
      const response = await fetch("/api/auth/telegram/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ redirect_to: safeRedirect, locale }),
      });
      if (!response.ok) {
        popup?.close();
        setErrorKey("loginError");
        setPhase("error");
        return;
      }
      const data = (await response.json()) as { id: string; telegramUrl: string };
      setChallengeId(data.id);
      setTelegramUrl(data.telegramUrl);
      sessionStorage.setItem(STORAGE_KEY, data.id);
      openTelegram(data.telegramUrl, popup);
      startPolling(data.id, true);
    } catch {
      popup?.close();
      setErrorKey("loginError");
      setPhase("error");
    }
  }

  if (verifyId && (phase === "ready" || phase === "waiting" || phase === "claiming")) {
    return (
      <ConfirmContinueCard
        title={t("confirmLoginTitle")}
        description={t("confirmLoginBody")}
        pending={phase === "claiming"}
        message={
          phase === "waiting"
            ? t("waitingForTelegram")
            : claimMessage
        }
        onConfirm={() => {
          if (challengeId) void claim(challengeId);
        }}
      />
    );
  }

  if (phase === "ready" && challengeId) {
    return (
      <ConfirmContinueCard
        title={t("confirmLoginTitle")}
        description={t("confirmLoginBody")}
        pending={false}
        onConfirm={() => void claim(challengeId)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {phase === "waiting" ? (
        <div className="space-y-3 text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {t("waitingTitle")}
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t("waitingBody")}
          </p>
          {telegramUrl ? (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="kk-btn-primary w-full"
            >
              <TelegramMark className="h-5 w-5" />
              {t("openTelegramAgain")}
            </a>
          ) : (
            <p className="text-sm text-zinc-500">{t("waitingForTelegram")}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void startTelegramLogin()}
          className="kk-btn-primary w-full"
        >
          <TelegramMark className="h-5 w-5" />
          {t("continueInTelegram")}
        </button>
      )}

      {phase === "error" && errorKey ? (
        <div className="space-y-3">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {t(errorKey)}
          </p>
          <button type="button" onClick={() => void startTelegramLogin()} className="kk-btn-secondary w-full">
            {t("continueInTelegram")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
