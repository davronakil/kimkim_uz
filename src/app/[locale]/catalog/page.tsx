import type { Metadata } from "next";
import { Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { normalizeStoredCategory } from "@/lib/catalog/categories";
import { BusinessCard } from "@/components/catalog/business-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { EmptyState } from "@/components/ui/empty-state";
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
  const tCategories = await getTranslations("catalog.categories");
  const user = await getCurrentUser();
  const listings = await listApprovedBusinessListings(category);

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

      <CatalogFilters activeCategory={category} />

      {listings.length === 0 ? (
        <EmptyState icon={Store} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <BusinessCard
              key={listing.id}
              listing={listing}
              locale={locale}
              categoryLabel={tCategories(
                normalizeStoredCategory(listing.category) as Parameters<typeof tCategories>[0],
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
