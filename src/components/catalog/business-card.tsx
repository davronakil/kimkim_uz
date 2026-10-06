import { Link } from "@/i18n/navigation";
import { MapPin, ThumbsUp } from "lucide-react";
import { BusinessCoverImage } from "@/components/catalog/business-cover-image";
import type { BusinessListingWithRepresentativeFields } from "@/types";
import { displayName } from "@/lib/utils";

type BusinessCardProps = {
  listing: BusinessListingWithRepresentativeFields;
  categoryLabel: string;
  distanceLabel?: string | null;
};

export function BusinessCard({ listing, categoryLabel, distanceLabel }: BusinessCardProps) {
  const description = listing.description?.trim();
  const placeLabel = distanceLabel ?? listing.location_name;

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="group flex h-full w-full min-w-0 max-w-full touch-manipulation flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:sm:hover:border-emerald-900"
    >
      <div className="aspect-[16/10] min-w-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <BusinessCoverImage
          listing={listing}
          submittedByName={displayName(listing)}
          variant="card"
          className="h-full w-full max-w-full object-cover transition duration-300 sm:group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          {categoryLabel}
        </p>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-950 group-hover:text-emerald-600 dark:text-zinc-50 sm:text-lg">
          {listing.name}
        </h3>
        {description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        ) : null}
        {placeLabel || listing.vouch_count > 0 ? (
          <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-sm text-zinc-500">
            {placeLabel ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">{placeLabel}</span>
              </span>
            ) : (
              <span />
            )}
            {listing.vouch_count > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <ThumbsUp className="h-3.5 w-3.5" />
                {listing.vouch_count}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
