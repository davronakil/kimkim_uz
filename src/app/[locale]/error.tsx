"use client";

import { CalendarPlus, Home, LayoutGrid, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ErrorPage } from "@/components/errors/error-page";
import { Link } from "@/i18n/navigation";

export default function ErrorPageBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      eyebrow={t("errorEyebrow")}
      title={t("errorTitle")}
      description={t("errorDescription")}
      icon={TriangleAlert}
      suggestions={[
        { icon: RefreshCw, text: t("tipRetry") },
        { icon: Home, text: t("tipHomeSignedIn") },
        { icon: LayoutGrid, text: t("tipEvents") },
      ]}
    >
      <button type="button" onClick={reset} className="kk-btn-primary w-full sm:w-auto">
        <RefreshCw className="h-4 w-4" />
        {t("tryAgain")}
      </button>
      <Link href="/" className="kk-btn-secondary w-full sm:w-auto">
        <Home className="h-4 w-4" />
        {t("goHome")}
      </Link>
      <Link href="/events" className="kk-btn-secondary w-full sm:w-auto">
        <LayoutGrid className="h-4 w-4" />
        {common("myEvents")}
      </Link>
      <Link href="/events/new" className="kk-btn-secondary w-full sm:w-auto">
        <CalendarPlus className="h-4 w-4" />
        {common("createEvent")}
      </Link>
    </ErrorPage>
  );
}
