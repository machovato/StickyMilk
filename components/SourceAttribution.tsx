import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { RecipeSource } from "@/lib/types";

interface SourceAttributionProps {
  source?: RecipeSource;
  variant?: "card" | "detail";
  className?: string;
}

export function SourceAttribution({
  source,
  variant = "card",
  className = "",
}: SourceAttributionProps) {
  if (!source) return null;

  if (variant === "card") {
    let label = source.name;
    if (source.type === "creator" && source.handle) {
      label = source.handle;
    }

    return (
      <div
        className={`flex items-center gap-1 font-mono text-[10px] text-[#7f756f] truncate ${className}`}
      >
        <span className="uppercase text-[#a89e97]">
          {source.type === "creator" ? "Via" : "Source"}:
        </span>
        <span className="font-semibold text-[#4d4540] truncate">
          {label}
        </span>
        {source.platform && (
          <span className="text-[#a89e97]">({source.platform})</span>
        )}
      </div>
    );
  }

  // Detail page presentation
  return (
    <div
      className={`p-3.5 bg-[#fbf8f5] border border-[#1a130e]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs ${className}`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#1a130e] text-white">
            {source.type === "vendor"
              ? "VENDOR SOURCE"
              : source.type === "creator"
              ? "CREATOR INSPIRATION"
              : "STICKYMILK ORIGINAL"}
          </span>
          <span className="font-syne font-bold text-sm text-[#1a130e]">
            {source.name}
          </span>
          {source.handle && (
            <span className="font-mono text-xs text-[#001ec0] font-semibold">
              {source.handle}
            </span>
          )}
        </div>
        <p className="font-body text-xs text-[#7f756f]">
          {source.type === "vendor"
            ? "Formulated by roaster or equipment manufacturer test kitchens."
            : source.type === "creator"
            ? `Viral drink concept discovered on ${source.platform || "social media"}.`
            : "Developed specifically for StickyMilk multi-channel translation."}
        </p>
      </div>

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#001ec0] hover:text-[#1a130e] underline underline-offset-2 transition-colors flex-shrink-0"
        >
          <span>{source.type === "creator" ? "Watch Video" : "View Original"}</span>
          <ArrowSquareOut size={14} weight="bold" />
        </a>
      )}
    </div>
  );
}
