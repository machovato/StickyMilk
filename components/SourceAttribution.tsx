import Link from "next/link";
import { ArrowSquareOut, Heart } from "@phosphor-icons/react/dist/ssr";
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

  const creatorSlug =
    source.type === "creator"
      ? (source.handle || source.name)
          .replace(/^@/, "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_-]+/g, "-")
      : null;

  if (variant === "card") {
    let label = source.name;
    if (source.type === "creator" && source.handle) {
      label = source.handle;
    }

    return (
      <div
        className={`flex items-center gap-1.5 font-mono text-[10px] text-[#7f756f] truncate ${className}`}
      >
        {source.avatar && (
          <img
            src={source.avatar}
            alt={source.name}
            className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-[#1a130e]/20"
          />
        )}
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

  // Follow URL for creator
  const followUrl =
    source.type === "creator"
      ? source.url && source.url.includes("/video/")
        ? source.url.split("/video/")[0]
        : source.handle
        ? `https://www.tiktok.com/${source.handle}`
        : source.url
      : undefined;

  // Detail page presentation
  return (
    <div
      className={`p-3.5 sm:p-4 bg-[#fbf8f5] border border-[#1a130e]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${className}`}
    >
      <div className="flex items-center gap-3">
        {creatorSlug ? (
          <Link href={`/creators/${creatorSlug}`} className="group block flex-shrink-0" title={`View ${source.name}'s channel`}>
            {source.avatar ? (
              <img
                src={source.avatar}
                alt={source.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#1a130e]/20 group-hover:border-[#001ec0] transition-colors shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#1a130e] text-white flex items-center justify-center font-syne font-bold">
                {source.name[0]}
              </div>
            )}
          </Link>
        ) : (
          source.avatar && (
            <img
              src={source.avatar}
              alt={source.name}
              className="w-12 h-12 rounded-full object-cover border border-[#1a130e]/20 flex-shrink-0 shadow-sm"
            />
          )
        )}

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#1a130e] text-white">
              {source.type === "vendor"
                ? "VENDOR SOURCE"
                : source.type === "creator"
                ? "CREATOR INSPIRATION"
                : "STICKYMILK ORIGINAL"}
            </span>
            {creatorSlug ? (
              <Link
                href={`/creators/${creatorSlug}`}
                className="font-syne font-bold text-sm text-[#1a130e] hover:text-[#001ec0] transition-colors"
              >
                {source.name}
              </Link>
            ) : (
              <span className="font-syne font-bold text-sm text-[#1a130e]">
                {source.name}
              </span>
            )}
            {source.handle && (
              creatorSlug ? (
                <Link
                  href={`/creators/${creatorSlug}`}
                  className="font-mono text-xs text-[#001ec0] font-semibold hover:underline"
                >
                  {source.handle}
                </Link>
              ) : (
                <span className="font-mono text-xs text-[#001ec0] font-semibold">
                  {source.handle}
                </span>
              )
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
      </div>

      <div className="flex items-center gap-2 flex-wrap flex-shrink-0 pt-2 sm:pt-0">
        {creatorSlug && (
          <Link
            href={`/creators/${creatorSlug}`}
            className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1.5 bg-white border border-[#1a130e]/20 hover:border-[#1a130e] text-[#1a130e] transition-colors shadow-sm cursor-pointer"
          >
            <span>All Recipes</span>
          </Link>
        )}

        {followUrl && (
          <a
            href={followUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1.5 bg-[#b8f600] hover:bg-[#1a130e] text-[#1a130e] hover:text-white transition-colors shadow-sm cursor-pointer"
          >
            <Heart size={13} weight="fill" />
            <span>Follow</span>
            <ArrowSquareOut size={12} weight="bold" />
          </a>
        )}

        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#001ec0] hover:text-[#1a130e] underline underline-offset-2 transition-colors px-1"
          >
            <span>{source.type === "creator" ? "Watch Video" : "View Original"}</span>
            <ArrowSquareOut size={13} weight="bold" />
          </a>
        )}
      </div>
    </div>
  );
}
