import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Channel, Recipe } from "@/lib/types";
import { CHANNEL_LABELS, FORMAT_LABELS, SWEETNESS_LABELS } from "@/lib/types";
import { getRecipeImage } from "@/lib/recipe-images";

interface RecipeCardProps {
  recipe: Recipe;
  channel: Channel;
}

export function RecipeCard({ recipe, channel }: RecipeCardProps) {
  const prep = recipe.preparations.find((p) => p.channel === channel);
  const image = getRecipeImage(recipe.slug);

  // Category badge styling variant
  const getBadgeClass = (format: string) => {
    switch (format) {
      case "iced":
      case "mocktail":
        return "bg-[#b8f600] text-[#141f00] font-bold";
      case "cocktail":
      case "baking":
        return "bg-[#001ec0] text-white font-bold";
      case "hot":
      case "affogato":
      default:
        return "bg-[#1a130e] text-white font-bold";
    }
  };

  const roastLabel = prep?.roast_recommendation
    ? `${prep.roast_recommendation.toUpperCase()} ROAST`
    : "ANY ROAST";

  const caffeineLabel = prep?.caffeine_level
    ? `${prep.caffeine_level.toUpperCase()} CAFFEINE`
    : "CAFFEINE";

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group recipe-card flex flex-col bg-white hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-xl border border-[#1a130e]/10 text-left"
    >
      {/* Aspect square image banner */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#221a15]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Google Cloud studio photography mapped from Stitch prototype */}
        <img
          src={recipe.image || image.imageUrl}
          alt={image.imageAlt || recipe.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top category badge */}
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap z-10">
          <span
            className={`px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${getBadgeClass(
              recipe.format
            )}`}
          >
            {FORMAT_LABELS[recipe.format]}
          </span>
        </div>

        {/* Ratio & Time HUD */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-[#1a130e]/90 text-white px-2.5 py-1.5 backdrop-blur-sm z-10 border border-white/10">
          <span className="font-mono text-xs text-[#b8f600] font-bold tracking-wider">
            {SWEETNESS_LABELS[recipe.sweetness_level].toUpperCase()}
          </span>
          <span className="font-mono text-xs text-[#d1c4bd]">
            {prep
              ? `${String(prep.prep_time_minutes).padStart(2, "0")}:00 MIN`
              : "READY"}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {/* Metadata row */}
          <div className="flex items-center justify-between text-[#4d4540] font-mono text-[11px] gap-2">
            <span className="uppercase text-[#001ec0] font-bold truncate">
              {`${roastLabel} // ${caffeineLabel}`}
            </span>
            <span className="truncate text-right text-[10px] text-[#4d4540]">
              {CHANNEL_LABELS[channel].toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-syne text-xl font-bold text-[#1a130e] tracking-tight group-hover:text-[#001ec0] transition-colors line-clamp-1">
            {recipe.name}
          </h2>

          {/* Description / Flavor Notes */}
          <p className="font-body text-[13px] leading-relaxed text-[#4d4540] line-clamp-2">
            {recipe.flavor_notes}
          </p>
        </div>

        {/* Tags & Action Button */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[11px] bg-[#f3ede9] px-2 py-0.5 text-[#1d1b19]"
              >
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>

          <div className="w-full py-2.5 bg-[#1a130e] text-white group-hover:bg-[#001ec0] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-[0_2px_0_#1A130E] active:translate-y-0.5">
            <span>View Formula</span>
            <ArrowRight size={16} weight="bold" />
          </div>
        </div>
      </div>
    </Link>
  );
}
