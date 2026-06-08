import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/locale";
import { ogCardLabels } from "@/lib/og/event-card-labels";
import { resolveEventOgAccent, truncateText } from "@/lib/og/event-theme";
import type { Event } from "@/types";

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

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

  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = truncateText(lines[maxLines - 1]!, maxCharsPerLine);
  }

  return lines;
}

export function renderEventCardSvg(
  event: Event,
  locale: Locale,
  options?: { includeEmoji?: boolean },
) {
  const includeEmoji = options?.includeEmoji ?? true;
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

  const location = event.location_name
    ? truncateText(event.location_name, 52)
    : null;
  const paymentLabel = strings.payment[event.payment_mode ?? "free"];

  const titleTspans = titleLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : 62;
      return `<tspan x="72" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const locationBlock = location
    ? `
      <g transform="translate(72 470)">
        <rect x="0" y="0" width="1056" height="72" rx="20" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.16)"/>
        <text x="28" y="30" fill="rgba(255,255,255,0.72)" font-size="20" font-family="system-ui, sans-serif">${escapeXml(strings.location)}</text>
        <text x="28" y="58" fill="#ffffff" font-size="26" font-weight="600" font-family="system-ui, sans-serif">${escapeXml(location)}</text>
      </g>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(event.title)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent.gradientFrom}"/>
      <stop offset="100%" stop-color="${accent.gradientTo}"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="10%" r="55%">
      <stop offset="0%" stop-color="${accent.glow}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent.glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1040" cy="120" r="180" fill="${accent.glow}" opacity="0.12" filter="url(#soft)"/>
  <circle cx="140" cy="560" r="220" fill="#ffffff" opacity="0.06" filter="url(#soft)"/>

  <g transform="translate(72 56)">
    <rect x="0" y="0" width="52" height="52" rx="14" fill="#ffffff"/>
    <text x="14" y="38" fill="${accent.gradientFrom}" font-size="30" font-weight="800" font-family="system-ui, sans-serif">K</text>
    <text x="68" y="34" fill="#ffffff" font-size="30" font-weight="700" font-family="system-ui, sans-serif">${escapeXml(strings.brand)}</text>
    <text x="68" y="58" fill="rgba(255,255,255,0.72)" font-size="18" font-family="system-ui, sans-serif">${escapeXml(strings.tagline)}</text>
  </g>

  ${
    includeEmoji
      ? `<text x="1080" y="92" text-anchor="end" font-size="72">${accent.emoji}</text>`
      : `<circle cx="1080" cy="72" r="34" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>`
  }

  <text x="72" y="220" fill="#ffffff" font-size="58" font-weight="700" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
    ${titleTspans}
  </text>

  <g transform="translate(72 360)">
    <rect x="0" y="0" width="520" height="88" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
    <text x="28" y="34" fill="rgba(255,255,255,0.72)" font-size="20" font-family="system-ui, sans-serif">${escapeXml(strings.date)}</text>
    <text x="28" y="66" fill="#ffffff" font-size="28" font-weight="600" font-family="system-ui, sans-serif">${escapeXml(dateLabel)}</text>
  </g>

  <g transform="translate(608 360)">
    <rect x="0" y="0" width="520" height="88" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
    <text x="28" y="34" fill="rgba(255,255,255,0.72)" font-size="20" font-family="system-ui, sans-serif">KimKim</text>
    <text x="28" y="66" fill="#ffffff" font-size="28" font-weight="600" font-family="system-ui, sans-serif">${escapeXml(paymentLabel)}</text>
  </g>

  ${locationBlock}
</svg>`;
}
