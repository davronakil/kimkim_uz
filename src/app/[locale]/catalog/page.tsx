import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listApprovedBusinessListings } from "@/lib/db/catalog-queries";
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
    pagePath: `/${locale}/catalog`,
    title: catalog("title"),
    description: catalog("metaDescription"),
    ogTitle: catalog("title"),
  });
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const user = await getCurrentUser();
  const listings = await listApprovedBusinessListings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="kk-page-title">{t("title")}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">{t("subtitle")}</p>
        </div>
        {user ? (
          <Link href="/catalog/manage" className="kk-btn-primary w-full sm:w-auto">
            {t("manageListings")}
          </Link>
        ) : (
          <Link href="/login" className="kk-btn-primary w-full sm:w-auto">
            {t("signInToSubmit")}
          </Link>
        )}
      </div>

      <CatalogBrowser listings={listings} initialCategory={category} />
    </div>
  );
}
