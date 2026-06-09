import { normalizeStoredCategory } from "@/lib/catalog/categories";

export type BusinessCoverAccent = {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  glow: string;
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const palette: BusinessCoverAccent[] = [
  { emoji: "✨", gradientFrom: "#059669", gradientTo: "#0d9488", glow: "#34d399" },
  { emoji: "✨", gradientFrom: "#047857", gradientTo: "#0891b2", glow: "#2dd4bf" },
  { emoji: "✨", gradientFrom: "#0f766e", gradientTo: "#10b981", glow: "#6ee7b7" },
  { emoji: "✨", gradientFrom: "#065f46", gradientTo: "#14b8a6", glow: "#5eead4" },
  { emoji: "✨", gradientFrom: "#115e59", gradientTo: "#059669", glow: "#5eead4" },
  { emoji: "✨", gradientFrom: "#134e4a", gradientTo: "#0e7490", glow: "#67e8f9" },
];

const categoryThemes: Record<string, BusinessCoverAccent[]> = {
  restaurant: [
    { emoji: "🍽️", gradientFrom: "#b45309", gradientTo: "#dc2626", glow: "#fb923c" },
    { emoji: "🍽️", gradientFrom: "#9a3412", gradientTo: "#c2410c", glow: "#fdba74" },
    { emoji: "🍜", gradientFrom: "#92400e", gradientTo: "#b45309", glow: "#fbbf24" },
  ],
  cafe: [
    { emoji: "☕", gradientFrom: "#78350f", gradientTo: "#92400e", glow: "#d97706" },
    { emoji: "☕", gradientFrom: "#57534e", gradientTo: "#78350f", glow: "#fbbf24" },
    { emoji: "🥐", gradientFrom: "#a16207", gradientTo: "#ca8a04", glow: "#fde047" },
  ],
  bakery: [
    { emoji: "🥐", gradientFrom: "#a16207", gradientTo: "#ca8a04", glow: "#fde047" },
    { emoji: "🍞", gradientFrom: "#92400e", gradientTo: "#d97706", glow: "#fbbf24" },
    { emoji: "🧁", gradientFrom: "#be185d", gradientTo: "#db2777", glow: "#f9a8d4" },
  ],
  catering: [
    { emoji: "🍱", gradientFrom: "#0f766e", gradientTo: "#059669", glow: "#6ee7b7" },
    { emoji: "🥘", gradientFrom: "#b45309", gradientTo: "#0f766e", glow: "#fcd34d" },
    { emoji: "🍽️", gradientFrom: "#047857", gradientTo: "#0891b2", glow: "#5eead4" },
  ],
  banquet_hall: [
    { emoji: "🥂", gradientFrom: "#831843", gradientTo: "#9a3412", glow: "#fbcfe8" },
    { emoji: "🏛️", gradientFrom: "#701a75", gradientTo: "#b45309", glow: "#f0abfc" },
    { emoji: "✨", gradientFrom: "#9d174d", gradientTo: "#c2410c", glow: "#fda4af" },
  ],
  event_venue: [
    { emoji: "💒", gradientFrom: "#831843", gradientTo: "#be185d", glow: "#fbcfe8" },
    { emoji: "🎪", gradientFrom: "#9d174d", gradientTo: "#db2777", glow: "#f9a8d4" },
    { emoji: "✨", gradientFrom: "#701a75", gradientTo: "#c026d3", glow: "#f0abfc" },
  ],
  dacha: [
    { emoji: "🏡", gradientFrom: "#15803d", gradientTo: "#0f766e", glow: "#86efac" },
    { emoji: "🌳", gradientFrom: "#166534", gradientTo: "#047857", glow: "#4ade80" },
    { emoji: "🏡", gradientFrom: "#14532d", gradientTo: "#059669", glow: "#6ee7b7" },
  ],
  hotel: [
    { emoji: "🏨", gradientFrom: "#1e3a8a", gradientTo: "#0e7490", glow: "#67e8f9" },
    { emoji: "🛎️", gradientFrom: "#1e40af", gradientTo: "#0891b2", glow: "#7dd3fc" },
    { emoji: "🏨", gradientFrom: "#312e81", gradientTo: "#0369a1", glow: "#818cf8" },
  ],
  sauna_banya: [
    { emoji: "🧖", gradientFrom: "#9a3412", gradientTo: "#b45309", glow: "#fdba74" },
    { emoji: "♨️", gradientFrom: "#7f1d1d", gradientTo: "#c2410c", glow: "#fca5a5" },
    { emoji: "🪵", gradientFrom: "#78350f", gradientTo: "#92400e", glow: "#fcd34d" },
  ],
  photographer: [
    { emoji: "📸", gradientFrom: "#1e293b", gradientTo: "#334155", glow: "#94a3b8" },
    { emoji: "📷", gradientFrom: "#0f172a", gradientTo: "#1e3a8a", glow: "#60a5fa" },
    { emoji: "📸", gradientFrom: "#312e81", gradientTo: "#475569", glow: "#a5b4fc" },
  ],
  videographer: [
    { emoji: "🎥", gradientFrom: "#312e81", gradientTo: "#1e293b", glow: "#a5b4fc" },
    { emoji: "🎬", gradientFrom: "#3730a3", gradientTo: "#334155", glow: "#818cf8" },
    { emoji: "📹", gradientFrom: "#1e1b4b", gradientTo: "#475569", glow: "#c4b5fd" },
  ],
  dj: [
    { emoji: "🎧", gradientFrom: "#5b21b6", gradientTo: "#db2777", glow: "#e879f9" },
    { emoji: "🎵", gradientFrom: "#4338ca", gradientTo: "#be185d", glow: "#a78bfa" },
    { emoji: "🔊", gradientFrom: "#312e81", gradientTo: "#9d174d", glow: "#c4b5fd" },
  ],
  mc_host: [
    { emoji: "🎤", gradientFrom: "#4338ca", gradientTo: "#7c3aed", glow: "#a78bfa" },
    { emoji: "🎙️", gradientFrom: "#3730a3", gradientTo: "#6d28d9", glow: "#c4b5fd" },
    { emoji: "✨", gradientFrom: "#312e81", gradientTo: "#9333ea", glow: "#818cf8" },
  ],
  decorator: [
    { emoji: "🎈", gradientFrom: "#db2777", gradientTo: "#7c3aed", glow: "#f9a8d4" },
    { emoji: "🪩", gradientFrom: "#be185d", gradientTo: "#4338ca", glow: "#f0abfc" },
    { emoji: "✨", gradientFrom: "#9d174d", gradientTo: "#3730a3", glow: "#fda4af" },
  ],
  florist: [
    { emoji: "💐", gradientFrom: "#be185d", gradientTo: "#059669", glow: "#fbcfe8" },
    { emoji: "🌸", gradientFrom: "#9d174d", gradientTo: "#047857", glow: "#f9a8d4" },
    { emoji: "🌷", gradientFrom: "#831843", gradientTo: "#0f766e", glow: "#fda4af" },
  ],
  event_planner: [
    { emoji: "🎉", gradientFrom: "#7c3aed", gradientTo: "#db2777", glow: "#f0abfc" },
    { emoji: "📋", gradientFrom: "#6d28d9", gradientTo: "#be185d", glow: "#e879f9" },
    { emoji: "🎊", gradientFrom: "#5b21b6", gradientTo: "#9333ea", glow: "#c4b5fd" },
  ],
  beauty_salon: [
    { emoji: "💄", gradientFrom: "#be185d", gradientTo: "#9333ea", glow: "#f0abfc" },
    { emoji: "💆", gradientFrom: "#9d174d", gradientTo: "#7c3aed", glow: "#f9a8d4" },
    { emoji: "✨", gradientFrom: "#701a75", gradientTo: "#be185d", glow: "#e879f9" },
  ],
  barbershop: [
    { emoji: "💈", gradientFrom: "#1e3a8a", gradientTo: "#312e81", glow: "#818cf8" },
    { emoji: "✂️", gradientFrom: "#1e293b", gradientTo: "#334155", glow: "#94a3b8" },
    { emoji: "💈", gradientFrom: "#0f172a", gradientTo: "#1e40af", glow: "#60a5fa" },
  ],
  nail_salon: [
    { emoji: "💅", gradientFrom: "#be185d", gradientTo: "#db2777", glow: "#f9a8d4" },
    { emoji: "💅", gradientFrom: "#9d174d", gradientTo: "#c026d3", glow: "#f0abfc" },
    { emoji: "✨", gradientFrom: "#831843", gradientTo: "#be185d", glow: "#fbcfe8" },
  ],
  gym: [
    { emoji: "💪", gradientFrom: "#b91c1c", gradientTo: "#ea580c", glow: "#fb923c" },
    { emoji: "🏋️", gradientFrom: "#991b1b", gradientTo: "#c2410c", glow: "#f87171" },
    { emoji: "💪", gradientFrom: "#7f1d1d", gradientTo: "#b45309", glow: "#fdba74" },
  ],
  studio: [
    { emoji: "🎬", gradientFrom: "#312e81", gradientTo: "#6d28d9", glow: "#a78bfa" },
    { emoji: "🎙️", gradientFrom: "#1e1b4b", gradientTo: "#4338ca", glow: "#818cf8" },
    { emoji: "📸", gradientFrom: "#3730a3", gradientTo: "#7c3aed", glow: "#c4b5fd" },
  ],
  travel_agency: [
    { emoji: "✈️", gradientFrom: "#0284c7", gradientTo: "#0891b2", glow: "#7dd3fc" },
    { emoji: "🧳", gradientFrom: "#0369a1", gradientTo: "#0d9488", glow: "#67e8f9" },
    { emoji: "🌍", gradientFrom: "#1d4ed8", gradientTo: "#0e7490", glow: "#93c5fd" },
  ],
  real_estate: [
    { emoji: "🏠", gradientFrom: "#0369a1", gradientTo: "#0f766e", glow: "#67e8f9" },
    { emoji: "🏢", gradientFrom: "#1d4ed8", gradientTo: "#047857", glow: "#60a5fa" },
    { emoji: "🔑", gradientFrom: "#1e40af", gradientTo: "#059669", glow: "#7dd3fc" },
  ],
  digital_marketing_agency: [
    { emoji: "📱", gradientFrom: "#4338ca", gradientTo: "#0891b2", glow: "#818cf8" },
    { emoji: "💻", gradientFrom: "#312e81", gradientTo: "#0e7490", glow: "#67e8f9" },
    { emoji: "📈", gradientFrom: "#3730a3", gradientTo: "#0284c7", glow: "#a5b4fc" },
  ],
  auto_service: [
    { emoji: "🔧", gradientFrom: "#334155", gradientTo: "#1e293b", glow: "#94a3b8" },
    { emoji: "🚗", gradientFrom: "#475569", gradientTo: "#0f172a", glow: "#cbd5e1" },
    { emoji: "🛞", gradientFrom: "#1e293b", gradientTo: "#334155", glow: "#64748b" },
  ],
  clinic: [
    { emoji: "🏥", gradientFrom: "#0369a1", gradientTo: "#0d9488", glow: "#7dd3fc" },
    { emoji: "🩺", gradientFrom: "#0284c7", gradientTo: "#059669", glow: "#67e8f9" },
    { emoji: "💊", gradientFrom: "#1d4ed8", gradientTo: "#047857", glow: "#93c5fd" },
  ],
  tutoring: [
    { emoji: "📚", gradientFrom: "#4338ca", gradientTo: "#7c3aed", glow: "#a78bfa" },
    { emoji: "🎓", gradientFrom: "#3730a3", gradientTo: "#6d28d9", glow: "#c4b5fd" },
    { emoji: "✏️", gradientFrom: "#312e81", gradientTo: "#9333ea", glow: "#818cf8" },
  ],
  tailor: [
    { emoji: "🧵", gradientFrom: "#7c2d12", gradientTo: "#9a3412", glow: "#fdba74" },
    { emoji: "👔", gradientFrom: "#78350f", gradientTo: "#b45309", glow: "#fcd34d" },
    { emoji: "✂️", gradientFrom: "#92400e", gradientTo: "#c2410c", glow: "#fbbf24" },
  ],
  cleaning_service: [
    { emoji: "✨", gradientFrom: "#0891b2", gradientTo: "#059669", glow: "#67e8f9" },
    { emoji: "🧼", gradientFrom: "#0e7490", gradientTo: "#047857", glow: "#5eead4" },
    { emoji: "🫧", gradientFrom: "#0284c7", gradientTo: "#0f766e", glow: "#7dd3fc" },
  ],
  other: palette,
};

export function resolveBusinessCoverAccent(
  category: string,
  listingId: string,
): BusinessCoverAccent {
  const normalized = normalizeStoredCategory(category);
  const themes = categoryThemes[normalized] ?? categoryThemes.other!;
  return themes[hashString(`${listingId}:${normalized}`) % themes.length]!;
}
