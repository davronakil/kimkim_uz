import type { Locale } from "@/i18n/config";

type SiteCardCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: string[];
};

const siteCardCopy: Record<Locale, SiteCardCopy> = {
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
};

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

export function renderSiteCardSvg(locale: Locale) {
  const copy = siteCardCopy[locale] ?? siteCardCopy.en;
  const titleLines = wrapText(copy.title, locale === "ru" ? 24 : 28, 2);
  const subtitleLines = wrapText(copy.subtitle, locale === "ru" ? 48 : 56, 2);

  const titleTspans = titleLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : 68;
      return `<tspan x="72" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const subtitleTspans = subtitleLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : 36;
      return `<tspan x="76" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const chips = copy.chips
    .map((chip, index) => {
      const x = 72 + index * 246;
      return `
      <g transform="translate(${x} 496)">
        <rect width="216" height="58" rx="18" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.18)"/>
        <text x="108" y="37" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="650" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">${escapeXml(chip)}</text>
      </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(copy.title)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="52%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
    <radialGradient id="glow" cx="82%" cy="8%" r="58%">
      <stop offset="0%" stop-color="#a7f3d0" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#a7f3d0" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1040" cy="132" r="188" fill="#a7f3d0" opacity="0.12" filter="url(#soft)"/>
  <circle cx="162" cy="565" r="230" fill="#ffffff" opacity="0.07" filter="url(#soft)"/>

  <g transform="translate(72 56)">
    <rect x="0" y="0" width="56" height="56" rx="16" fill="#ffffff"/>
    <text x="15" y="41" fill="#047857" font-size="32" font-weight="850" font-family="system-ui, sans-serif">K</text>
    <text x="72" y="37" fill="#ffffff" font-size="32" font-weight="750" font-family="system-ui, sans-serif">KimKim.uz</text>
    <text x="72" y="62" fill="rgba(255,255,255,0.72)" font-size="18" font-family="system-ui, sans-serif">${escapeXml(copy.eyebrow)}</text>
  </g>

  <text x="72" y="234" fill="#ffffff" font-size="62" font-weight="760" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
    ${titleTspans}
  </text>

  <text x="76" y="394" fill="rgba(255,255,255,0.78)" font-size="29" font-weight="450" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
    ${subtitleTspans}
  </text>

  ${chips}
</svg>`;
}
