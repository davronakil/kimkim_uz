import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { Link } from "@/i18n/navigation";
import { isStoredBusinessCategory, normalizeStoredCategory } from "@/lib/catalog/categories";
import { getCurrentUser } from "@/lib/auth/session";
import { listApprovedBusinessListings } from "@/lib/db/catalog-queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { category: categoryParam } = await searchParams;
  const catalog = await getTranslations({ locale, namespace: "catalog" });
  const normalizedCategory = categoryParam ? normalizeStoredCategory(categoryParam) : null;
  const hasCategory = Boolean(categoryParam && isStoredBusinessCategory(categoryParam));

  if (hasCategory && normalizedCategory) {
    const categoryLabel = catalog(`categories.${normalizedCategory}`);
    const pagePath = `/${locale}/catalog?category=${normalizedCategory}`;

    return buildSitePageMetadata({
      locale,
      pagePath,
      title: `${categoryLabel} — ${catalog("title")}`,
      description: catalog("categoryMetaDescription", { category: categoryLabel }),
      ogTitle: `${categoryLabel} — ${catalog("title")}`,
    });
  }

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const user = await getCurrentUser();
  const listings = await listApprovedBusinessListings();

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white px-5 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.14),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="kk-page-title">{t("title")}</h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              {t("subtitle")}
            </p>
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
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl bg-zinc-200/70 dark:bg-zinc-900" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-64 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-900" />
              <div className="h-64 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-900" />
              <div className="hidden h-64 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 lg:block" />
            </div>
          </div>
        }
      >
        <CatalogBrowser listings={listings} />
      </Suspense>
    </div>
  );
}
