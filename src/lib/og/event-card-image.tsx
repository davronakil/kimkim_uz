import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/locale";
import { ogCardLabels } from "@/lib/og/event-card-labels";
import { resolveEventOgAccent, truncateText } from "@/lib/og/event-theme";
import type { Event } from "@/types";

function wrapTitle(title: string, maxCharsPerLine: number, maxLines: number) {
  const words = title.trim().split(/\s+/);
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

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

export function EventCardImage({ event, locale }: { event: Event; locale: Locale }) {
  const strings = ogCardLabels(locale);
  const accent = resolveEventOgAccent(event.title, event.id);
  const titleLines = wrapTitle(event.title, 22, 3);
  const dateLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(new Date(event.starts_at));
  const location = event.location_name ? truncateText(event.location_name, 52) : null;
  const paymentLabel = strings.payment[event.payment_mode ?? "free"];

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        padding: "56px 72px",
        color: "white",
        background: `linear-gradient(135deg, ${accent.gradientFrom}, ${accent.gradientTo})`,
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-40px",
          top: "-70px",
          width: "360px",
          height: "360px",
          borderRadius: "999px",
          background: accent.glow,
          opacity: 0.2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-110px",
          bottom: "-130px",
          width: "430px",
          height: "430px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.08)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "white",
            color: accent.gradientFrom,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 850,
          }}
        >
          K
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 750 }}>{strings.brand}</div>
          <div style={{ marginTop: 2, fontSize: 18, color: "rgba(255,255,255,0.72)" }}>
            {strings.tagline}
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 72 }}>{accent.emoji}</div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 104,
          fontSize: 58,
          lineHeight: 1.06,
          fontWeight: 780,
          letterSpacing: 0,
        }}
      >
        {titleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <InfoBox label={strings.date} value={dateLabel} />
          <InfoBox label="KimKim" value={paymentLabel} />
        </div>
        {location ? <InfoBox label={strings.location} value={location} wide /> : null}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        width: wide ? "1056px" : "520px",
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
      <div style={{ marginTop: 5, fontSize: 27, fontWeight: 650 }}>{value}</div>
    </div>
  );
}
