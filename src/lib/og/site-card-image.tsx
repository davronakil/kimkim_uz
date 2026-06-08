import type { Locale } from "@/i18n/config";

const siteCardCopy = {
  en: {
    eyebrow: "Telegram-first event planning",
    title: "Gatherings, invites, and shared costs",
    subtitle: "Plan the gathering, invite your people, track RSVPs, and keep money clear.",
    chips: ["Invites", "RSVPs", "Comments", "Expenses"],
  },
  uz: {
    eyebrow: "Telegram uchun qulay event rejalash",
    title: "Eventlar, mehmonlar va xarajatlar",
    subtitle: "Taklif yuboring, kim kelishini biling va hisob-kitobni bir joyda yuriting.",
    chips: ["Taklif", "RSVP", "Izohlar", "Xarajatlar"],
  },
  ru: {
    eyebrow: "Планирование встреч через Telegram",
    title: "Встречи, гости и расходы",
    subtitle: "Приглашения, ответы гостей и общий счёт — в одном спокойном месте.",
    chips: ["Приглашения", "RSVP", "Обсуждение", "Расходы"],
  },
} satisfies Record<Locale, { eyebrow: string; title: string; subtitle: string; chips: string[] }>;

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

export function SiteCardImage({ locale }: { locale: Locale }) {
  const copy = siteCardCopy[locale] ?? siteCardCopy.en;
  const titleLines = wrapText(copy.title, locale === "ru" ? 24 : 28, 2);
  const subtitleLines = wrapText(copy.subtitle, locale === "ru" ? 48 : 56, 2);

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        padding: "56px 72px",
        color: "white",
        background: "linear-gradient(135deg, #064e3b 0%, #0f766e 52%, #18181b 100%)",
        fontFamily: "Inter, Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-34px",
          top: "-82px",
          width: 380,
          height: 380,
          borderRadius: 999,
          background: "#a7f3d0",
          opacity: 0.16,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "white",
            color: "#047857",
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
            {copy.eyebrow}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 112,
          fontSize: 62,
          lineHeight: 1.08,
          fontWeight: 780,
        }}
      >
        {titleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 32,
          fontSize: 29,
          lineHeight: 1.25,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {subtitleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 30, marginTop: "auto" }}>
        {copy.chips.map((chip) => (
          <div
            key={chip}
            style={{
              width: 216,
              height: 58,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.13)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 650,
            }}
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}
