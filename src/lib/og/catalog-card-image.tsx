import type { Locale } from "@/i18n/config";
import { catalogCategoryLabel } from "@/lib/catalog/labels";
import { truncateText } from "@/lib/og/event-theme";
import type { BusinessListing } from "@/types";

const copy = {
  en: { eyebrow: "KimKim catalog", vouches: "community vouches", listed: "Local business" },
  uz: { eyebrow: "KimKim katalogi", vouches: "jamoa tavsiyasi", listed: "Mahalliy biznes" },
  ru: { eyebrow: "Каталог KimKim", vouches: "отметок доверия", listed: "Местный бизнес" },
} satisfies Record<Locale, { eyebrow: string; vouches: string; listed: string }>;

const accents = [
  { from: "#065f46", to: "#0f766e", glow: "#6ee7b7" },
  { from: "#0f766e", to: "#0891b2", glow: "#67e8f9" },
  { from: "#047857", to: "#14532d", glow: "#86efac" },
  { from: "#134e4a", to: "#059669", glow: "#99f6e4" },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function CatalogCardImage({
  listing,
  locale,
  vouchCount,
}: {
  listing: BusinessListing;
  locale: Locale;
  vouchCount: number;
}) {
  const strings = copy[locale] ?? copy.en;
  const accent = accents[hashString(listing.id) % accents.length]!;
  const category = catalogCategoryLabel(locale, listing.category);
  const titleLines = wrapText(listing.name, 24, 3);
  const description = listing.description
    ? truncateText(listing.description, 96)
    : listing.location_name || strings.listed;

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        padding: "56px 72px",
        color: "white",
        background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-60px",
          top: "-88px",
          width: 420,
          height: 420,
          borderRadius: 999,
          background: accent.glow,
          opacity: 0.18,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-140px",
          bottom: "-160px",
          width: 480,
          height: 480,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "white",
            color: accent.from,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 850,
          }}
        >
          K
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, fontWeight: 760 }}>KimKim.uz</div>
          <div style={{ marginTop: 2, fontSize: 18, color: "rgba(255,255,255,0.72)" }}>
            {strings.eyebrow}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            padding: "14px 22px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {category}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 104,
          fontSize: 60,
          lineHeight: 1.06,
          fontWeight: 800,
          letterSpacing: 0,
        }}
      >
        {titleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          maxWidth: 900,
          fontSize: 28,
          lineHeight: 1.25,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {description}
      </div>

      <div style={{ marginTop: "auto", display: "flex", gap: 16 }}>
        <InfoBox label={strings.listed} value={listing.location_name ?? category} />
        <InfoBox label="KimKim" value={`${vouchCount} ${strings.vouches}`} />
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        width: 520,
        height: 76,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 28px",
      }}
    >
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 27, fontWeight: 650 }}>
        {truncateText(value, 44)}
      </div>
    </div>
  );
}
