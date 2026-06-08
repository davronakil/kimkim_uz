import { resolveBusinessCoverAccent } from "@/lib/catalog/cover-theme";

function hashUnit(listingId: string, salt: number) {
  let hash = salt;
  for (let i = 0; i < listingId.length; i += 1) {
    hash = (hash * 31 + listingId.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function businessInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "K";
  const first = [...trimmed][0];
  return first?.toLocaleUpperCase() ?? "K";
}

type BusinessCoverPlaceholderProps = {
  name: string;
  listingId: string;
  category: string;
  categoryLabel: string;
  locationName?: string | null;
  variant?: "card" | "hero";
  className?: string;
};

export function BusinessCoverPlaceholder({
  name,
  listingId,
  category,
  categoryLabel,
  locationName,
  variant = "hero",
  className = "",
}: BusinessCoverPlaceholderProps) {
  const accent = resolveBusinessCoverAccent(category, listingId);
  const initial = businessInitial(name);
  const isCard = variant === "card";

  const blobA = {
    left: `${12 + hashUnit(listingId, 3) * 28}%`,
    top: `${8 + hashUnit(listingId, 7) * 24}%`,
    size: 120 + hashUnit(listingId, 11) * 80,
  };
  const blobB = {
    right: `${6 + hashUnit(listingId, 13) * 22}%`,
    bottom: `${10 + hashUnit(listingId, 17) * 20}%`,
    size: 140 + hashUnit(listingId, 19) * 100,
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accent.gradientFrom} 0%, ${accent.gradientTo} 55%, ${accent.gradientFrom} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: isCard ? "18px 18px" : "24px 24px",
        }}
      />

      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          left: blobA.left,
          top: blobA.top,
          width: blobA.size,
          height: blobA.size,
          backgroundColor: accent.glow,
          opacity: 0.35,
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          right: blobB.right,
          bottom: blobB.bottom,
          width: blobB.size,
          height: blobB.size,
          backgroundColor: "#ffffff",
          opacity: 0.12,
        }}
      />

      <span
        className={`pointer-events-none absolute select-none font-bold leading-none text-white/10 ${
          isCard ? "bottom-2 left-3 text-7xl" : "bottom-4 left-5 text-[9rem] sm:text-[11rem]"
        }`}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {initial}
      </span>

      <span
        className={`pointer-events-none absolute select-none drop-shadow-sm ${
          isCard ? "right-3 top-3 text-4xl" : "right-5 top-5 text-6xl sm:text-7xl"
        }`}
        role="img"
        aria-label=""
      >
        {accent.emoji}
      </span>

      <div
        className={`pointer-events-none absolute rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md ${
          isCard
            ? "bottom-3 left-3 max-w-[70%] px-2.5 py-2"
            : "bottom-5 left-5 max-w-[min(100%,20rem)] px-4 py-3 sm:bottom-6 sm:left-6"
        }`}
      >
        <p
          className={`font-semibold uppercase tracking-[0.18em] text-white/75 ${
            isCard ? "text-[9px]" : "text-[10px] sm:text-xs"
          }`}
        >
          {categoryLabel}
        </p>
        {locationName ? (
          <p
            className={`mt-1 line-clamp-2 font-medium leading-snug text-white ${
              isCard ? "text-xs" : "text-sm sm:text-base"
            }`}
          >
            {locationName}
          </p>
        ) : (
          <p
            className={`mt-1 line-clamp-2 font-semibold leading-snug text-white ${
              isCard ? "text-sm" : "text-base sm:text-lg"
            }`}
          >
            {name}
          </p>
        )}
      </div>

      {!isCard ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-6">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-extrabold"
              style={{ color: accent.gradientFrom }}
            >
              K
            </span>
            <span className="text-sm font-semibold text-white/90">KimKim</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
