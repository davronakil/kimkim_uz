import { CalendarPlus, Compass, Home, LayoutGrid } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ErrorPage } from "@/components/errors/error-page";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function NotFoundPage() {
  const locale = await getLocale();
  setRequestLocale(locale);

  const t = await getTranslations("errors");
  const common = await getTranslations("common");
  const user = await getCurrentUser();

  const suggestions = user
    ? [
        { icon: Home, text: t("tipHomeSignedIn") },
        { icon: LayoutGrid, text: t("tipEvents") },
        { icon: CalendarPlus, text: t("tipCreate") },
      ]
    : [
        { icon: Home, text: t("tipHomeSignedOut") },
        { icon: Compass, text: t("tipExplore") },
      ];

  return (
    <ErrorPage
      code="404"
      eyebrow={t("notFoundEyebrow")}
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      icon={Compass}
      suggestions={suggestions}
    >
      <Link href="/" className="kk-btn-primary w-full sm:w-auto">
        <Home className="h-4 w-4" />
        {t("goHome")}
      </Link>
      {user ? (
        <>
          <Link href="/events" className="kk-btn-secondary w-full sm:w-auto">
            <LayoutGrid className="h-4 w-4" />
            {common("myEvents")}
          </Link>
          <Link href="/events/new" className="kk-btn-secondary w-full sm:w-auto">
            <CalendarPlus className="h-4 w-4" />
            {common("createEvent")}
          </Link>
        </>
      ) : (
        <Link href="/login" className="kk-btn-secondary w-full sm:w-auto">
          {common("signIn")}
        </Link>
      )}
    </ErrorPage>
  );
}
