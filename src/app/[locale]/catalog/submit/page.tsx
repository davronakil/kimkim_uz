import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BusinessListingForm } from "@/components/catalog/business-listing-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getBusinessListingSlotSummaryForUser } from "@/lib/db/catalog-queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";
import { isSuperadmin } from "@/lib/platform/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const catalog = await getTranslations({ locale, namespace: "catalog" });

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog/submit`,
    title: catalog("submitTitle"),
    description: catalog("metaDescription"),
    robots: { index: false, follow: false },
  });
}

export default async function CatalogSubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const superadmin = await isSuperadmin(user);
  if (!superadmin) {
    const slots = await getBusinessListingSlotSummaryForUser(user);
    if (slots.remaining <= 0) {
      return redirect({ href: "/catalog/manage", locale });
    }
  }

  const t = await getTranslations("catalog");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="kk-page-title">{t("submitTitle")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">
          {superadmin ? t("submitSubtitleSuperadmin") : t("submitSubtitle")}
        </p>
      </div>
      <BusinessListingForm
        mode="create"
        defaultTelegramUsername={user.username}
        instantPublish={superadmin}
      />
    </div>
  );
}
