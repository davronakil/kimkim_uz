import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminManagementPanel } from "@/components/admin/admin-management-panel";
import { CatalogReviewPanel } from "@/components/admin/catalog-review-panel";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildSitePageMetadata } from "@/lib/page-metadata";
import { getPlatformAdminRole, isSuperadmin } from "@/lib/platform/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const admin = await getTranslations({ locale, namespace: "admin" });

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/admin`,
    title: admin("title"),
    description: admin("metaDescription"),
    robots: { index: false, follow: false },
  });
}

export default async function AdminPage({
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

  const role = await getPlatformAdminRole(user);
  if (!role) {
    return redirect({ href: "/", locale });
  }

  const t = await getTranslations("admin");
  const superadmin = await isSuperadmin(user);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="kk-page-title">{t("title")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">{t("subtitle")}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("catalog.sectionTitle")}</h2>
        <CatalogReviewPanel locale={locale} />
      </section>

      {superadmin ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("admins.sectionTitle")}</h2>
          <AdminManagementPanel />
        </section>
      ) : null}
    </div>
  );
}
