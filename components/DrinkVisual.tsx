import type { Recipe, RecipeFormat } from "@/lib/types";

/**
 * Lightweight, format-appropriate vessel silhouette for the hero — a stand-in
 * for real recipe photography. Deliberately generic per format (never a
 * specific garnish/glass/ingredient we don't actually know about): a tall
 * glass for iced drinks, a mug for hot drinks, a coupe for cocktails, a
 * highball for mocktails/tonics, a dessert coupe for affogato, a skillet for
 * baking. Pure CSS/SVG outlines, no photography, no per-recipe assumptions.
 */

const VESSEL_LABEL: Record<RecipeFormat, string> = {
  hot: "Mug",
  iced: "Tall glass",
  mocktail: "Highball",
  cocktail: "Coupe",
  affogato: "Dessert coupe",
  baking: "Skillet",
};

function Vessel({ format }: { format: RecipeFormat }) {
  const stroke = "currentColor";
  switch (format) {
    case "hot":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M20 28h34v26a17 17 0 0 1-17 17 17 17 0 0 1-17-17V28Z" />
          <path d="M54 34h6a8 8 0 0 1 0 16h-6" />
          <path d="M28 20q3-5 6 0t6 0t6 0" opacity="0.55" />
        </svg>
      );
    case "iced":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M26 16h28l-4 54a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6L26 16Z" />
          <path d="M29 30h22M30 42h20M31 54h18" opacity="0.4" />
        </svg>
      );
    case "mocktail":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M28 14h24l-2 52a10 10 0 0 1-20 0L28 14Z" />
          <path d="M27 32h26" opacity="0.4" />
        </svg>
      );
    case "cocktail":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M18 16h44L40 44Z" />
          <path d="M40 44v24" />
          <path d="M28 68h24" />
        </svg>
      );
    case "affogato":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M16 34c0-6 10.7-11 24-11s24 5 24 11-10.7 11-24 11-24-5-24-11Z" />
          <path d="M16 34c0 12 3 22 8 30h32c5-8 8-18 8-30" />
          <circle cx="40" cy="30" r="8" opacity="0.55" />
        </svg>
      );
    case "baking":
      return (
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke={stroke} strokeWidth="2">
          <circle cx="38" cy="40" r="24" />
          <path d="M62 36h10M60 26h9M60 48h9" />
        </svg>
      );
    default:
      return null;
  }
}

export function DrinkVisual({
  recipe,
  compact = false,
}: {
  recipe: Recipe;
  /** Card-sized treatment (no rounded corners of its own — the parent card
   *  clips it — and a shorter fixed height) instead of the full hero size. */
  compact?: boolean;
}) {
  const height = compact ? "h-40" : "h-56 md:h-72";
  const roundedClass = compact ? "" : "rounded-lg";

  if (recipe.image) {
    return (
      <div className={`w-full overflow-hidden ${height} ${roundedClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- editor-supplied path/URL */}
        <img src={recipe.image} alt={recipe.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-gradient-to-b from-cream-deep to-gold-soft/40 dark:from-ink dark:to-ink-soft ${height} ${roundedClass}`}
      role="img"
      aria-label={`${VESSEL_LABEL[recipe.format]} — no photo yet for ${recipe.name}`}
    >
      <div className={`text-ink/60 dark:text-cream/40 ${compact ? "h-20 w-20" : "h-28 w-28 md:h-36 md:w-36"}`}>
        <Vessel format={recipe.format} />
      </div>
    </div>
  );
}
