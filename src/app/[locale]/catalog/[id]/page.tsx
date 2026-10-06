import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, MapPin, Phone, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RelatedBusinessListings } from "@/components/catalog/related-business-listings";
import { BusinessShareActions } from "@/components/catalog/business-share-actions";
import { BusinessCoverImage } from "@/components/catalog/business-cover-image";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { BusinessVouchButton } from "@/components/catalog/business-vouch-button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildBusinessListingJsonLd } from "@/lib/catalog/json-ld";
import {
  getBusinessListingVouchSummary,
  getBusinessListingWithRepresentative,
} from "@/lib/db/catalog-queries";
import { normalizeStoredCategory } from "@/lib/catalog/categories";
import { buildSitePageMetadata } from "@/lib/page-metadata";
import { JsonLd } from "@/lib/seo";
import { buildAppUrl } from "@/lib/telegram/bot";
import { displayName } from "@/lib/utils";
import { isPlatformAdmin } from "@/lib/platform/admin";

function websiteHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ContactRow({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:text-emerald-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:text-emerald-300"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </a>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const listing = await getBusinessListingWithRepresentative(id);

  if (!listing || listing.status !== "approved") {
    return buildSitePageMetadata({
      locale,
      pagePath: `/${locale}/catalog/${id}`,
      title: "Catalog",
      description: "",
      robots: { index: false, follow: false },
    });
  }

  const imageUrl = listing.cover_image_key
    ? buildAppUrl(`/api/media/${listing.cover_image_key}`)
    : buildAppUrl(`/api/og/catalog/${listing.id}?locale=${locale}`);

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog/${id}`,
    title: listing.name,
    description: listing.description ?? listing.name,
    ogTitle: listing.name,
    imageUrl,
    imageAlt: listing.name,
  });
}

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const tCategories = await getTranslations("catalog.categories");
  const common = await getTranslations("common");
  const listing = await getBusinessListingWithRepresentative(id);

  if (!listing) notFound();

  const user = await getCurrentUser();
  const canView =
    listing.status === "approved" ||
    (user &&
      (listing.representative_user_id === user.id || (await isPlatformAdmin(user))));

  if (!canView) notFound();

  const isOwner = user?.id === listing.representative_user_id;
  const vouchSummary =
    listing.status === "approved"
      ? await getBusinessListingVouchSummary(id, user?.id)
      : { count: 0, vouchedByMe: false };
  const categoryLabel = tCategories(
    normalizeStoredCategory(listing.category) as Parameters<typeof tCategories>[0],
  );
  const jsonLd =
    listing.status === "approved"
      ? buildBusinessListingJsonLd({
          listing,
          locale,
          categoryLabel,
          vouchCount: vouchSummary.count,
        })
      : null;
  const mapsUrl =
    listing.location_lat != null && listing.location_lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${listing.location_lat},${listing.location_lng}`
      : listing.location_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location_address)}`
        : null;

  const telegramHandle = listing.telegram_username?.replace(/^@/, "");
  const hasContacts = Boolean(listing.phone || telegramHandle || listing.website_url || mapsUrl);
  const showAside = hasContacts || listing.status === "approved";
  const listedBy = displayName(listing);

  return (
    <div className="space-y-8">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToCatalog")}
        </Link>
        {isOwner ? (
          <Link href={`/catalog/${id}/edit`} className="kk-btn-secondary">
            {common("edit")}
          </Link>
        ) : null}
      </div>

      <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="aspect-[4/3] overflow-hidden bg-zinc-100 sm:aspect-[2/1] dark:bg-zinc-800">
          <BusinessCoverImage
            listing={listing}
            submittedByName={listedBy}
            variant="hero"
            className="h-full w-full object-cover"
          />
        </div>
        <div
          className={`grid gap-8 p-5 sm:p-8 ${
            showAside ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10" : ""
          }`}
        >
          <div className="min-w-0 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/catalog?category=${normalizeStoredCategory(listing.category)}`}
                  className="transition hover:opacity-80"
                >
                  <CategoryBadge category={listing.category} locale={locale} />
                </Link>
                {listing.status !== "approved" ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      listing.status === "pending"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {listing.status === "pending" ? t("statusPending") : t("statusRejected")}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                {listing.name}
              </h1>
              {listing.location_name ? (
                <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {listing.location_name}
                    {listing.location_address && listing.location_address !== listing.location_name ? (
                      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                        {listing.location_address}
                      </span>
                    ) : null}
                  </span>
                </p>
              ) : null}
            </div>

            {listing.description ? (
              <p className="max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                {listing.description}
              </p>
            ) : null}

            {listing.status === "rejected" && listing.rejection_reason ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-100">
                {listing.rejection_reason}
              </p>
            ) : null}

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("representative", { name: listedBy })}
            </p>
          </div>

          {showAside ? (
            <aside className="space-y-4 lg:sticky lg:top-20">
              {hasContacts ? (
                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  {listing.phone ? (
                    <ContactRow href={`tel:${listing.phone}`} icon={Phone} label={listing.phone} />
                  ) : null}
                  {telegramHandle ? (
                    <ContactRow
                      href={`https://t.me/${telegramHandle}`}
                      icon={Send}
                      label={`@${telegramHandle}`}
                      external
                    />
                  ) : null}
                  {listing.website_url ? (
                    <ContactRow
                      href={listing.website_url}
                      icon={ExternalLink}
                      label={websiteHost(listing.website_url)}
                      external
                    />
                  ) : null}
                  {mapsUrl ? (
                    <ContactRow href={mapsUrl} icon={MapPin} label={t("openInMaps")} external />
                  ) : null}
                </div>
              ) : null}

              {listing.status === "approved" ? (
                <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <BusinessVouchButton
                    listingId={listing.id}
                    initialCount={vouchSummary.count}
                    initialVouched={vouchSummary.vouchedByMe}
                    loggedIn={Boolean(user)}
                    isOwner={Boolean(isOwner)}
                  />
                </div>
              ) : null}

              {listing.status === "approved" ? (
                <BusinessShareActions listingName={listing.name} variant="compact" />
              ) : null}
            </aside>
          ) : null}
        </div>
      </article>

      {listing.status === "approved" ? (
        <RelatedBusinessListings listingId={listing.id} category={listing.category} />
      ) : null}
    </div>
  );
}
