export type GooglePlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type PlacePrediction = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
};

export const centralAsiaBounds = {
  north: 45.6,
  south: 37.0,
  east: 73.2,
  west: 55.9,
};

export const usBounds = {
  north: 49.5,
  south: 24.5,
  east: -66.9,
  west: -125.0,
};

/** Google Autocomplete allows up to 5 countries. */
export const locationSearchCountries = ["uz", "kz", "kg", "tj", "us"] as const;

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      Map: new (
        element: HTMLElement,
        options: {
          center: { lat: number; lng: number };
          zoom: number;
          mapTypeControl?: boolean;
          streetViewControl?: boolean;
          fullscreenControl?: boolean;
        },
      ) => {
        setCenter: (center: { lat: number; lng: number }) => void;
        setZoom: (zoom: number) => void;
      };
      Marker: new (options: {
        position: { lat: number; lng: number };
        map: unknown;
        title?: string;
      }) => {
        addListener: (eventName: string, handler: () => void) => void;
        setMap: (map: unknown | null) => void;
      };
      InfoWindow: new (options: { content: string }) => {
        open: (options: { map: unknown; anchor: unknown }) => void;
      };
      LatLng: new (lat: number, lng: number) => unknown;
      LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
      places: {
        AutocompleteService: new () => {
          getPlacePredictions: (
            request: {
              input: string;
              bounds?: typeof centralAsiaBounds;
              componentRestrictions?: { country: string | string[] };
            },
            callback: (
              predictions: Array<{
                place_id: string;
                description: string;
                structured_formatting: {
                  main_text: string;
                  secondary_text?: string;
                };
              }> | null,
              status: string,
            ) => void,
          ) => void;
        };
        PlacesService: new (element: HTMLElement) => {
          getDetails: (
            request: { placeId: string; fields: string[] },
            callback: (
              place: {
                name?: string;
                formatted_address?: string;
                geometry?: {
                  location?: {
                    lat: () => number;
                    lng: () => number;
                  };
                };
              } | null,
              status: string,
            ) => void,
          ) => void;
          textSearch: (
            request: {
              query: string;
              bounds?: typeof centralAsiaBounds;
            },
            callback: (
              results: Array<{
                place_id?: string;
                name?: string;
                formatted_address?: string;
                geometry?: {
                  location?: {
                    lat: () => number;
                    lng: () => number;
                  };
                };
              }> | null,
              status: string,
            ) => void,
          ) => void;
        };
      };
      event?: {
        clearInstanceListeners: (instance: unknown) => void;
      };
    };
  };
};

export type GoogleMapsRuntime = NonNullable<GoogleMapsWindow["google"]>["maps"];

let loaderPromise: Promise<void> | null = null;
let runtimeApiKey: string | null = null;
let runtimeApiKeyPromise: Promise<string> | null = null;
let placesServiceHost: HTMLDivElement | null = null;

function getBuildTimeApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
}

export function getGoogleMapsApiKey() {
  return getBuildTimeApiKey() || runtimeApiKey || "";
}

export async function resolveGoogleMapsApiKey(): Promise<string> {
  const buildTimeKey = getBuildTimeApiKey();
  if (buildTimeKey) return buildTimeKey;

  if (runtimeApiKey) return runtimeApiKey;

  if (!runtimeApiKeyPromise) {
    runtimeApiKeyPromise = fetch("/api/config/public", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return "";
        const data = (await response.json()) as { googleMapsApiKey?: string };
        return data.googleMapsApiKey ?? "";
      })
      .then((key) => {
        runtimeApiKey = key;
        return key;
      })
      .catch(() => "");
  }

  return runtimeApiKeyPromise;
}

export function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  const win = window as GoogleMapsWindow;
  if (win.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!loaderPromise) {
    loaderPromise = resolveGoogleMapsApiKey().then((apiKey) => {
      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      }

      return new Promise<void>((resolve, reject) => {
        const callbackName = "__kimkimGoogleMapsInit";
        (window as unknown as Record<string, () => void>)[callbackName] = () => {
          resolve();
        };

        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-kimkim-google-maps="true"]',
        );
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")), {
            once: true,
          });
          return;
        }

        const script = document.createElement("script");
        script.dataset.kimkimGoogleMaps = "true";
        script.async = true;
        script.defer = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callbackName}`;
        script.onerror = () => reject(new Error("Google Maps failed to load"));
        document.head.appendChild(script);
      });
    });
  }

  return loaderPromise;
}

function getGoogleMaps() {
  const win = window as GoogleMapsWindow;
  if (!win.google?.maps?.places) {
    throw new Error("Google Places is not loaded");
  }
  return win.google.maps;
}

export function getLoadedGoogleMaps(): GoogleMapsRuntime {
  return getGoogleMaps();
}

function getPlacesService() {
  const maps = getGoogleMaps();
  if (!placesServiceHost) {
    placesServiceHost = document.createElement("div");
  }
  return new maps.places.PlacesService(placesServiceHost);
}

function mapPrediction(prediction: {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}): PlacePrediction {
  return {
    placeId: prediction.place_id,
    mainText: prediction.structured_formatting.main_text,
    secondaryText: prediction.structured_formatting.secondary_text ?? "",
    description: prediction.description,
  };
}

function fetchAutocompletePredictions(input: string): Promise<PlacePrediction[]> {
  return new Promise((resolve) => {
    const maps = getGoogleMaps();
    const service = new maps.places.AutocompleteService();

    service.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: [...locationSearchCountries] },
      },
      (predictions, status) => {
        if (status !== "OK" || !predictions) {
          resolve([]);
          return;
        }
        resolve(predictions.map(mapPrediction));
      },
    );
  });
}

function isWithinBounds(
  lat: number,
  lng: number,
  bounds: { north: number; south: number; east: number; west: number },
) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function isWithinSearchRegion(lat: number, lng: number) {
  return isWithinBounds(lat, lng, centralAsiaBounds) || isWithinBounds(lat, lng, usBounds);
}

function fetchTextSearchResultsForBounds(
  input: string,
  bounds: { north: number; south: number; east: number; west: number },
): Promise<PlacePrediction[]> {
  return new Promise((resolve) => {
    const service = getPlacesService();

    service.textSearch(
      {
        query: input,
        bounds,
      },
      (results, status) => {
        if (status !== "OK" || !results) {
          resolve([]);
          return;
        }

        resolve(
          results
            .filter((result) => {
              if (!result.place_id || !result.name) return false;
              const location = result.geometry?.location;
              if (!location) return true;
              return isWithinSearchRegion(location.lat(), location.lng());
            })
            .map((result) => ({
              placeId: result.place_id!,
              mainText: result.name!,
              secondaryText: result.formatted_address ?? "",
              description: [result.name, result.formatted_address].filter(Boolean).join(", "),
            })),
        );
      },
    );
  });
}

function fetchTextSearchResults(input: string): Promise<PlacePrediction[]> {
  return Promise.all([
    fetchTextSearchResultsForBounds(input, centralAsiaBounds),
    fetchTextSearchResultsForBounds(input, usBounds),
  ]).then(([centralAsia, us]) => [...centralAsia, ...us]);
}

export async function searchPlaces(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const [autocomplete, textSearch] = await Promise.all([
    fetchAutocompletePredictions(trimmed),
    fetchTextSearchResults(trimmed),
  ]);

  const seen = new Set<string>();
  const merged: PlacePrediction[] = [];

  for (const prediction of [...autocomplete, ...textSearch]) {
    if (seen.has(prediction.placeId)) continue;
    seen.add(prediction.placeId);
    merged.push(prediction);
  }

  return merged.slice(0, 8);
}

export function fetchPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  return new Promise((resolve) => {
    const service = getPlacesService();

    service.getDetails(
      {
        placeId,
        fields: ["name", "formatted_address", "geometry"],
      },
      (place, status) => {
        if (status !== "OK" || !place?.geometry?.location) {
          resolve(null);
          return;
        }

        resolve({
          name: place.name ?? place.formatted_address ?? "",
          address: place.formatted_address ?? "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      },
    );
  });
}
