import { Link } from "@/i18n/navigation";
import { MapPin, ThumbsUp } from "lucide-react";
import { BusinessCoverImage } from "@/components/catalog/business-cover-image";
import { CategoryBadge } from "@/components/catalog/category-badge";
import type { BusinessListingWithRepresentativeFields } from "@/types";
import { displayName } from "@/lib/utils";

type BusinessCardProps = {
  listing: BusinessListingWithRepresentativeFields;
  locale: string;
  categoryLabel: string;
  distanceLabel?: string | null;
};

export function BusinessCard({ listing, locale, categoryLabel, distanceLabel }: BusinessCardProps) {
  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="group min-w-0 touch-manipulation overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:sm:hover:border-emerald-900"
    >
      <div className="aspect-[16/9] overflow-hidden">
        <BusinessCoverImage
          listing={listing}
          categoryLabel={categoryLabel}
          submittedByName={displayName(listing)}
          variant="card"
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
        />
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-lg font-semibold leading-snug group-hover:text-emerald-600 sm:text-xl">
            {listing.name}
          </h3>
          <CategoryBadge category={listing.category} locale={locale} size="sm" />
        </div>
        <p className="line-clamp-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">
          {listing.description || "—"}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {listing.vouch_count > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {listing.vouch_count}
            </span>
          ) : null}
          {distanceLabel ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-4 w-4" />
              {distanceLabel}
            </span>
          ) : listing.location_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {listing.location_name}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
