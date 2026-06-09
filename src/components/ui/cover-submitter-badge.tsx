import { personInitial } from "@/lib/utils";

export function CoverSubmitterBadge({
  name,
  accentColor,
  variant = "hero",
}: {
  name: string;
  accentColor: string;
  variant?: "card" | "hero";
}) {
  const isCard = variant === "card";

  return (
    <div
      className={`flex max-w-[85%] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm ${
        isCard ? "px-2 py-1" : "px-3 py-1.5"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg bg-white font-extrabold ${
          isCard ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-sm"
        }`}
        style={{ color: accentColor }}
      >
        {personInitial(name)}
      </span>
      <span
        className={`truncate font-semibold text-white/90 ${isCard ? "max-w-[6rem] text-xs" : "max-w-[9rem] text-sm"}`}
      >
        {name}
      </span>
    </div>
  );
}
