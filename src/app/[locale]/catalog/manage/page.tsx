import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogManagePanel } from "@/components/catalog/catalog-manage-panel";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const catalog = await getTranslations({ locale, namespace: "catalog" });

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog/manage`,
    title: catalog("manageTitle"),
    description: catalog("metaDescription"),
    robots: { index: false, follow: false },
  });
}

export default async function CatalogManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slot_session_id?: string; slot_checkout?: string }>;
}) {
  const { locale } = await params;
  const { slot_session_id: slotSessionId, slot_checkout: slotCheckout } = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("catalog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="kk-page-title">{t("manageTitle")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">{t("manageSubtitle")}</p>
      </div>
      <CatalogManagePanel
        locale={locale}
        slotSessionId={slotSessionId}
        slotCheckoutCancelled={slotCheckout === "cancelled"}
      />
    </div>
  );
}
