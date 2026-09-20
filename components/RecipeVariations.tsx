import Link from "next/link";
import { ArrowSquareOut, Sparkle } from "@phosphor-icons/react/dist/ssr";
import type { RecipeVariation } from "@/lib/types";

interface RecipeVariationsProps {
  variations?: RecipeVariation[];
  className?: string;
}

export function RecipeVariations({ variations, className = "" }: RecipeVariationsProps) {
  if (!variations || variations.length === 0) return null;

  return (
    <div
      className={`bg-white p-4 sm:p-5 border border-[#1a130e]/15 shadow-sm flex flex-col gap-3.5 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#1a130e]/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <span className="font-mono text-[11px] font-bold text-[#001ec0] uppercase tracking-wider">
            TRY THESE VARIETIES
          </span>
        </div>
        <Sparkle size={16} weight="bold" className="text-[#001ec0]" />
      </div>

      <p className="font-body text-xs text-[#7f756f] -mt-1">
        Other creator takes on this viral drink with different hacks and flavor twists:
      </p>

      <div className="flex flex-col gap-3">
        {variations.map((v, i) => (
          <div
            key={i}
            className="border border-[#1a130e]/10 hover:border-[#1a130e]/40 p-2.5 bg-[#fbf8f5] flex gap-3 group transition-all"
          >
            {/* Thumbnail */}
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-20 sm:w-24 aspect-[3/4] bg-[#221a15] overflow-hidden flex-shrink-0 border border-[#1a130e]/15 block"
              title={`Watch ${v.creator.name}'s version`}
            >
              <img
                src={v.thumbnail}
                alt={v.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute bottom-1 right-1 bg-[#1a130e]/90 text-white font-mono text-[9px] px-1 py-0.2">
                REEL
              </span>
            </a>

            {/* Info */}
            <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 font-mono text-[10px] text-[#7f756f] truncate">
                  <span className="font-bold text-[#1a130e] truncate">
                    {v.creator.handle || v.creator.name}
                  </span>
                  <span>({v.creator.platform || "TikTok"})</span>
                </div>

                <h4 className="font-syne font-bold text-xs text-[#1a130e] line-clamp-1 group-hover:text-[#001ec0] transition-colors">
                  {v.title}
                </h4>

                <p className="font-body text-[11px] text-[#4d4540] leading-snug line-clamp-2">
                  {v.twist}
                </p>
              </div>

              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#001ec0] hover:text-[#1a130e] underline underline-offset-2 transition-colors mt-2 w-fit"
              >
                <span>Watch {v.creator.handle || v.creator.name}'s Video</span>
                <ArrowSquareOut size={12} weight="bold" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
