"use client";

import { List, LocateFixed, Map, MapPin, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BusinessCard } from "@/components/catalog/business-card";
import { businessCategories, normalizeStoredCategory } from "@/lib/catalog/categories";
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
  initialCategory?: string;
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

export function CatalogBrowser({ listings, initialCategory }: CatalogBrowserProps) {
  const t = useTranslations("catalog");
  const tCategories = useTranslations("catalog.categories");
  const locale = useLocale();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<GoogleMapsRuntime["Map"]> | null>(null);
  const markerRefs = useRef<Array<InstanceType<GoogleMapsRuntime["Marker"]>>>([]);
  const searchRequestRef = useRef(0);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [mode, setMode] = useState<"list" | "map">("list");
  const [center, setCenter] = useState<GooglePlaceResult | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
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
    const selectedCategory = category.trim();
    const normalized = selectedCategory ? normalizeStoredCategory(selectedCategory) : "";
    const byCategory = selectedCategory
      ? listings.filter((listing) => normalizeStoredCategory(listing.category) === normalized)
      : listings;

    const withDistance = byCategory.map((listing) => {
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
  }, [activeCenter, category, listings, radiusKm]);

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

  function clearLocation() {
    setCenter(null);
    setQuery("");
    setPredictions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  const showDropdown = open && query.trim().length >= 2;
  const mapListings = filteredListings.filter(hasCoordinates);

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <label htmlFor="catalog-location-search" className="text-sm font-medium">
              {t("near")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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
                className="kk-input py-3.5 pl-10 pr-10"
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
                          <span className="text-xs text-zinc-500">
                            {prediction.secondaryText}
                          </span>
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

          <div className="flex flex-wrap gap-2">
            {radiusOptions.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setRadiusKm(radius)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  radiusKm === radius
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {t("radiusKm", { radius })}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                !category
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {t("allCategories")}
            </button>
            {businessCategories.map((businessCategory) => (
              <button
                key={businessCategory}
                type="button"
                onClick={() => setCategory(businessCategory)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  category === businessCategory
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {tCategories(businessCategory)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setMode("list")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
                mode === "list" ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              <List className="h-4 w-4" />
              {t("listView")}
            </button>
            <button
              type="button"
              onClick={() => setMode("map")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
                mode === "map" ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              <Map className="h-4 w-4" />
              {t("mapView")}
            </button>
          </div>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {activeCenter
            ? t("nearSummary", {
                count: filteredListings.length,
                radius: radiusKm,
                place: activeCenter.name,
              })
            : t("allSummary", { count: filteredListings.length })}
        </p>
      </div>

      {mode === "map" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            {locationStatus === "ready" ? (
              <div ref={mapRef} className="h-[420px] w-full" />
            ) : (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
                <LocateFixed className="h-8 w-8 text-emerald-600" />
                <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  {locationStatus === "unconfigured" ? t("locationUnavailable") : t("locationLoading")}
                </p>
              </div>
            )}
          </div>
          <div className="max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            {mapListings.length === 0 ? (
              <p className="p-3 text-sm text-zinc-500 dark:text-zinc-400">{t("noNearby")}</p>
            ) : (
              mapListings.map((listing) => {
                const mapsUrl = mapsSearchUrl(listing);
                return (
                  <div
                    key={listing.id}
                    className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{listing.name}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {listing.distanceKm != null
                            ? t("distanceKm", { distance: listing.distanceKm.toFixed(1) })
                            : listing.location_name}
                        </p>
                      </div>
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`/${locale}/catalog/${listing.id}`} className="kk-btn-secondary">
                        {t("viewListing")}
                      </a>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kk-btn-secondary"
                        >
                          {t("openInMaps")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
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
