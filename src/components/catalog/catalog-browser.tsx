"use client";

import { List, LocateFixed, Map, MapPin, Search, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BusinessCard } from "@/components/catalog/business-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link, useRouter } from "@/i18n/navigation";
import { categoryGroups, normalizeStoredCategory } from "@/lib/catalog/categories";
import {
  fetchPlaceDetails,
  getLoadedGoogleMaps,
  loadGoogleMapsPlaces,
  resolveGoogleMapsApiKey,
  searchPlaces,
  type GoogleMapsRuntime,
  type GooglePlaceResult,
  type PlacePrediction,
} from "@/lib/google-maps";
import type { BusinessListingWithRepresentativeFields } from "@/types";

type CatalogBrowserProps = {
  listings: BusinessListingWithRepresentativeFields[];
};

type ListingWithDistance = BusinessListingWithRepresentativeFields & {
  distanceKm: number | null;
};

const radiusOptions = [2, 5, 10, 25, 50] as const;
const defaultCenter = { name: "Tashkent", address: "Tashkent, Uzbekistan", lat: 41.2995, lng: 69.2401 };

function hasCoordinates(listing: BusinessListingWithRepresentativeFields) {
  return listing.location_lat != null && listing.location_lng != null;
}

function distanceKm(
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(second.lat - first.lat);
  const dLng = toRadians(second.lng - first.lng);
  const lat1 = toRadians(first.lat);
  const lat2 = toRadians(second.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapZoomForRadius(radiusKm: number) {
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 25) return 11;
  return 10;
}

function mapsSearchUrl(listing: BusinessListingWithRepresentativeFields) {
  if (listing.location_lat != null && listing.location_lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${listing.location_lat},${listing.location_lng}`;
  }
  if (listing.location_address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location_address)}`;
  }
  return null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function categoryLabelFor(
  listing: BusinessListingWithRepresentativeFields,
  tCategories: ReturnType<typeof useTranslations<"catalog.categories">>,
) {
  return tCategories(normalizeStoredCategory(listing.category) as Parameters<typeof tCategories>[0]);
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

export function CatalogBrowser({ listings }: CatalogBrowserProps) {
  const t = useTranslations("catalog");
  const tCategories = useTranslations("catalog.categories");
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const activeCategory = category.trim() ? normalizeStoredCategory(category.trim()) : "";
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryScrollerRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<GoogleMapsRuntime["Map"]> | null>(null);
  const markerRefs = useRef<Array<InstanceType<GoogleMapsRuntime["Marker"]>>>([]);
  const searchRequestRef = useRef(0);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [center, setCenter] = useState<GooglePlaceResult | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [textQuery, setTextQuery] = useState("");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "unconfigured"
  >("idle");
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const activeCenter = center;
  const mapCenter = center ?? defaultCenter;

  useEffect(() => {
    let cancelled = false;

    async function initMaps() {
      setLocationStatus("loading");
      try {
        const apiKey = await resolveGoogleMapsApiKey();
        if (!apiKey) {
          if (!cancelled) setLocationStatus("unconfigured");
          return;
        }

        await loadGoogleMapsPlaces();
        if (!cancelled) setLocationStatus("ready");
      } catch {
        if (!cancelled) setLocationStatus("error");
      }
    }

    void initMaps();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (locationStatus !== "ready") return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setSearching(false);
      setOpen(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setSearching(true);
    setOpen(true);

    const timeout = window.setTimeout(() => {
      void searchPlaces(trimmed).then((results) => {
        if (searchRequestRef.current !== requestId) return;
        setPredictions(results);
        setSearching(false);
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [locationStatus, query]);

  const filteredListings = useMemo<ListingWithDistance[]>(() => {
    const normalizedTextQuery = textQuery.trim().toLowerCase();
    const byCategory = activeCategory
      ? listings.filter((listing) => normalizeStoredCategory(listing.category) === activeCategory)
      : listings;

    const byText = normalizedTextQuery
      ? byCategory.filter((listing) => {
          const haystack = [
            listing.name,
            listing.description,
            listing.location_name,
            listing.location_address,
            categoryLabelFor(listing, tCategories),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedTextQuery);
        })
      : byCategory;

    const withDistance = byText.map((listing) => {
      const distance =
        activeCenter && hasCoordinates(listing)
          ? distanceKm(activeCenter, {
              lat: listing.location_lat!,
              lng: listing.location_lng!,
            })
          : null;

      return { ...listing, distanceKm: distance };
    });

    if (!activeCenter) return withDistance;

    return withDistance
      .filter((listing) => listing.distanceKm != null && listing.distanceKm <= radiusKm)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [activeCategory, activeCenter, listings, radiusKm, tCategories, textQuery]);

  useEffect(() => {
    if (mode !== "map" || locationStatus !== "ready" || !mapRef.current) return;

    const maps = getLoadedGoogleMaps();
    const map =
      mapInstanceRef.current ??
      new maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: center ? mapZoomForRadius(radiusKm) : 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

    mapInstanceRef.current = map;
    map.setCenter(mapCenter);
    map.setZoom(center ? mapZoomForRadius(radiusKm) : 11);
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = filteredListings
      .filter(hasCoordinates)
      .map((listing) => {
        const marker = new maps.Marker({
          position: { lat: listing.location_lat!, lng: listing.location_lng! },
          map,
          title: listing.name,
        });
        const info = new maps.InfoWindow({
          content: `<strong>${escapeHtml(listing.name)}</strong><br>${escapeHtml(
            listing.location_name ?? listing.location_address ?? "",
          )}`,
        });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
        return marker;
      });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [center, filteredListings, locationStatus, mapCenter, mode, radiusKm]);

  useEffect(() => {
    const chip = activeChipRef.current;
    const scroller = categoryScrollerRef.current;
    if (!chip || !scroller) return;
    const left = chip.offsetLeft - scroller.clientWidth / 2 + chip.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left) });
  }, [activeCategory]);

  async function choosePrediction(prediction: PlacePrediction) {
    setSearching(true);
    const place = await fetchPlaceDetails(prediction.placeId);
    setSearching(false);

    if (!place) return;

    setCenter(place);
    setQuery(place.name);
    setPredictions([]);
    setOpen(false);
  }

  function setCategoryFilter(nextCategory: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory) params.set("category", nextCategory);
    else params.delete("category");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `/catalog?${nextQuery}` : "/catalog", { scroll: false });
  }

  function clearLocation() {
    setCenter(null);
    setQuery("");
    setPredictions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function clearFilters() {
    setTextQuery("");
    setCenter(null);
    setQuery("");
    setPredictions([]);
    setOpen(false);
    setCategoryFilter("");
  }

  const showDropdown = open && query.trim().length >= 2;
  const mapListings = filteredListings.filter(hasCoordinates);
  const filtersActive = Boolean(activeCategory || activeCenter || textQuery.trim());
  const topVouchedListings = useMemo(
    () => listings.filter((listing) => listing.vouch_count > 0).slice(0, 3),
    [listings],
  );
  const recentListings = useMemo(() => {
    const featured = new Set(topVouchedListings.map((listing) => listing.id));
    return [...listings]
      .sort((a, b) => {
        const first = Date.parse(a.published_at ?? a.updated_at ?? a.created_at);
        const second = Date.parse(b.published_at ?? b.updated_at ?? b.created_at);
        return second - first;
      })
      .filter((listing) => !featured.has(listing.id))
      .slice(0, 3);
  }, [listings, topVouchedListings]);
  const railIds = useMemo(() => {
    if (filtersActive || mode !== "list") return new Set<string>();
    const ids = new Set([
      ...topVouchedListings.map((listing) => listing.id),
      ...recentListings.map((listing) => listing.id),
    ]);
    const remainder = listings.length - ids.size;
    if (ids.size === 0 || remainder < 3) return new Set<string>();
    return ids;
  }, [filtersActive, listings.length, mode, recentListings, topVouchedListings]);
  const mainListings = useMemo(
    () =>
      railIds.size > 0
        ? filteredListings.filter((listing) => !railIds.has(listing.id))
        : filteredListings,
    [filteredListings, railIds],
  );

  const mobileCardRail =
    "-mx-4 flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden";
  const mobileCardRailItem =
    "w-[min(18rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:shrink";

  const summary = activeCenter
    ? t("nearSummary", {
        count: filteredListings.length,
        radius: radiusKm,
        place: activeCenter.name,
      })
    : t("allSummary", { count: filteredListings.length });

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{summary}</p>
          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:w-[220px]">
            <button
              type="button"
              onClick={() => setMode("list")}
              aria-pressed={mode === "list"}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                mode === "list"
                  ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <List className="h-4 w-4" />
              {t("listView")}
            </button>
            <button
              type="button"
              onClick={() => setMode("map")}
              aria-pressed={mode === "map"}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                mode === "map"
                  ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Map className="h-4 w-4" />
              {t("mapView")}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="catalog-text-search" className="text-sm font-medium">
              {t("searchLabel")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="catalog-text-search"
                value={textQuery}
                type="search"
                autoComplete="off"
                onChange={(event) => setTextQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="kk-input bg-white py-3.5 pl-10 pr-10 dark:bg-zinc-900 [&::-webkit-search-cancel-button]:hidden"
              />
              {textQuery ? (
                <button
                  type="button"
                  onClick={() => setTextQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={t("clearSearch")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="catalog-location-search" className="text-sm font-medium">
              {t("near")}
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="catalog-location-search"
                ref={inputRef}
                value={query}
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => {
                  if (predictions.length > 0) setOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setOpen(false), 150);
                }}
                placeholder={
                  locationStatus === "loading"
                    ? t("locationLoading")
                    : locationStatus === "unconfigured"
                      ? t("locationUnavailable")
                      : t("nearPlaceholder")
                }
                className="kk-input bg-white py-3.5 pl-10 pr-10 dark:bg-zinc-900"
                disabled={locationStatus === "unconfigured"}
              />
              {center ? (
                <button
                  type="button"
                  onClick={clearLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={t("clearLocation")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}

              {showDropdown ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {searching && predictions.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-zinc-500">{t("locationSearching")}</li>
                  ) : null}

                  {predictions.map((prediction) => (
                    <li key={prediction.placeId} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="flex min-h-12 w-full flex-col items-start px-4 py-3 text-left hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void choosePrediction(prediction)}
                      >
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {prediction.mainText}
                        </span>
                        {prediction.secondaryText ? (
                          <span className="text-xs text-zinc-500">{prediction.secondaryText}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}

                  {!searching && predictions.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-zinc-500">{t("locationNoResults")}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        {activeCenter ? (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {radiusOptions.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setRadiusKm(radius)}
                className={`shrink-0 ${radiusKm === radius ? "kk-chip-active" : "kk-chip-inactive"}`}
              >
                {t("radiusKm", { radius })}
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative min-w-0">
          <div
            ref={categoryScrollerRef}
            className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              ref={activeCategory ? undefined : activeChipRef}
              onClick={() => setCategoryFilter("")}
              className={`shrink-0 ${!activeCategory ? "kk-chip-active" : "kk-chip-inactive"}`}
            >
              {t("allCategories")}
            </button>
            {categoryGroups.map((group, groupIndex) => (
              <span key={group.id} className="contents">
                {groupIndex > 0 ? (
                  <span
                    aria-hidden
                    className="mx-1 w-px shrink-0 self-stretch bg-zinc-200 dark:bg-zinc-700"
                  />
                ) : null}
                {group.categories.map((businessCategory) => {
                  const selected = activeCategory === businessCategory;
                  return (
                    <button
                      key={businessCategory}
                      type="button"
                      ref={selected ? activeChipRef : undefined}
                      onClick={() => setCategoryFilter(businessCategory)}
                      className={`shrink-0 ${selected ? "kk-chip-active" : "kk-chip-inactive"}`}
                    >
                      {tCategories(businessCategory)}
                    </button>
                  );
                })}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950" />
        </div>
      </div>

      {railIds.size > 0 && topVouchedListings.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t("topVouchedTitle")} subtitle={t("topVouchedSubtitle")} />
          <div className={mobileCardRail}>
            {topVouchedListings.map((listing) => (
              <div key={listing.id} className={mobileCardRailItem}>
                <BusinessCard
                  listing={listing}
                  categoryLabel={categoryLabelFor(listing, tCategories)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {railIds.size > 0 && recentListings.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t("recentTitle")} subtitle={t("recentSubtitle")} />
          <div className={mobileCardRail}>
            {recentListings.map((listing) => (
              <div key={listing.id} className={mobileCardRailItem}>
                <BusinessCard
                  listing={listing}
                  categoryLabel={categoryLabelFor(listing, tCategories)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "map" ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.7fr)]">
          <div className="min-h-[420px] min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {locationStatus === "ready" ? (
              <div ref={mapRef} className="h-[420px] w-full max-w-full sm:h-[520px]" />
            ) : (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-6 text-center sm:h-[520px]">
                <LocateFixed className="h-8 w-8 text-emerald-600" />
                <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  {locationStatus === "unconfigured" ? t("locationUnavailable") : t("locationLoading")}
                </p>
              </div>
            )}
          </div>
          <div className="min-w-0 max-h-[420px] space-y-2 overflow-auto sm:max-h-[520px]">
            {mapListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                {t("noNearby")}
              </div>
            ) : (
              mapListings.map((listing) => {
                const mapsUrl = mapsSearchUrl(listing);
                return (
                  <article
                    key={listing.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                      {categoryLabelFor(listing, tCategories)}
                    </p>
                    <Link
                      href={`/catalog/${listing.id}`}
                      className="mt-1 block font-semibold leading-snug hover:text-emerald-600"
                    >
                      {listing.name}
                    </Link>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">
                        {listing.distanceKm != null
                          ? t("distanceKm", { distance: listing.distanceKm.toFixed(1) })
                          : listing.location_name}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
                      <Link href={`/catalog/${listing.id}`} className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
                        {t("viewListing")}
                      </Link>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          {t("openInMaps")}
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState
          icon={Store}
          title={filtersActive ? t("noMatchesTitle") : t("emptyTitle")}
          description={filtersActive ? t("noMatchesBody") : t("emptyBody")}
        >
          {filtersActive ? (
            <button type="button" onClick={clearFilters} className="kk-btn-primary">
              {t("clearFilters")}
            </button>
          ) : (
            <Link href="/catalog/manage" className="kk-btn-primary">
              {t("addBusiness")}
            </Link>
          )}
        </EmptyState>
      ) : mainListings.length > 0 ? (
        <section className="space-y-3">
          {railIds.size > 0 ? (
            <SectionHeading
              title={t("allListingsTitle")}
              subtitle={t("allSummary", { count: mainListings.length })}
            />
          ) : null}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mainListings.map((listing) => (
              <BusinessCard
                key={listing.id}
                listing={listing}
                categoryLabel={categoryLabelFor(listing, tCategories)}
                distanceLabel={
                  listing.distanceKm != null
                    ? t("distanceKm", { distance: listing.distanceKm.toFixed(1) })
                    : null
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
