"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type LocationValue = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type LocationPickerProps = {
  onSelect: (value: LocationValue) => void;
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: { fields?: string[] },
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              name?: string;
              formatted_address?: string;
              geometry?: {
                location?: {
                  lat: () => number;
                  lng: () => number;
                };
              };
            };
          };
        };
      };
    };
  }
}

export function LocationPicker({ onSelect }: LocationPickerProps) {
  const t = useTranslations("events.form");
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    const initAutocomplete = () => {
      if (!window.google || !inputRef.current) return;
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry", "name"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;

        onSelect({
          name: place.name ?? place.formatted_address ?? "",
          address: place.formatted_address ?? "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      });

      setReady(true);
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, [apiKey, onSelect]);

  if (!apiKey) {
    return (
      <input
        name="location_name"
        placeholder={t("locationPlaceholder")}
        className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      placeholder={ready ? t("locationPlaceholder") : "Loading maps..."}
      className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
    />
  );
}
