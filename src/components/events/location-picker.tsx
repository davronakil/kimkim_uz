"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  fetchPlaceDetails,
  loadGoogleMapsPlaces,
  resolveGoogleMapsApiKey,
  searchPlaces,
  type GooglePlaceResult,
  type PlacePrediction,
} from "@/lib/google-maps";

export type LocationValue = GooglePlaceResult;

type LocationPickerProps = {
  onSelect: (value: LocationValue | null) => void;
  initialValue?: LocationValue | null;
};

export function LocationPicker({ onSelect, initialValue }: LocationPickerProps) {
  const t = useTranslations("events.form");
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  const searchRequestRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "unconfigured">(
    "idle",
  );
  const [selected, setSelected] = useState<LocationValue | null>(initialValue ?? null);
  const [query, setQuery] = useState(initialValue?.name ?? "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let cancelled = false;

    async function init() {
      setStatus("loading");
      try {
        const apiKey = await resolveGoogleMapsApiKey();
        if (!apiKey) {
          if (!cancelled) setStatus("unconfigured");
          return;
        }

        await loadGoogleMapsPlaces();
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || selected) return;

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
  }, [query, selected, status]);

  async function choosePrediction(prediction: PlacePrediction) {
    setSearching(true);
    const place = await fetchPlaceDetails(prediction.placeId);
    setSearching(false);

    if (!place) return;

    setSelected(place);
    setQuery(place.name);
    setPredictions([]);
    setOpen(false);
    onSelectRef.current(place);
  }

  function saveManualName() {
    const name = query.trim();
    if (!name) return;

    const manualPlace: LocationValue = {
      name,
      address: "",
      lat: 0,
      lng: 0,
    };

    setSelected(manualPlace);
    setPredictions([]);
    setOpen(false);
    onSelectRef.current(manualPlace);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setPredictions([]);
    setOpen(false);
    onSelectRef.current(null);
    inputRef.current?.focus();
  }

  if (status === "unconfigured") {
    return (
      <div className="space-y-2">
        <input
          name="location_name"
          defaultValue={initialValue?.name ?? ""}
          placeholder={t("locationPlaceholder")}
          className="kk-input"
        />
        <p className="text-xs text-amber-600">{t("locationMapsUnavailable")}</p>
      </div>
    );
  }

  const showDropdown = open && !selected && query.trim().length >= 2;
  const showManualOption =
    showDropdown && !searching && query.trim().length >= 2;

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={inputRef}
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selected) {
              setSelected(null);
              onSelectRef.current(null);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && predictions.length > 0) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={
            status === "loading"
              ? t("locationLoading")
              : status === "error"
                ? t("locationError")
                : t("locationPlaceholder")
          }
          className="kk-input py-3.5 pl-10"
        />

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

            {showManualOption ? (
              <li className="border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  className="min-h-12 w-full px-4 py-3 text-left text-base text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={saveManualName}
                >
                  {t("locationUseTypedName", { name: query.trim() })}
                </button>
              </li>
            ) : null}

            {!searching && predictions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">{t("locationNoResults")}</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <div>
            <p className="font-medium">{selected.name}</p>
            {selected.address ? (
              <p className="text-xs opacity-80">{selected.address}</p>
            ) : (
              <p className="text-xs opacity-80">{t("locationManualOnly")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 text-xs font-medium underline"
          >
            {t("locationClear")}
          </button>
        </div>
      ) : null}

      {status === "ready" ? (
        <p className="text-xs text-zinc-500">{t("locationHint")}</p>
      ) : null}
    </div>
  );
}
