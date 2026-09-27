import type { Preparation } from "./types";
// Nutrition lives with the ingredient taxonomy (one source of truth). Imported
// statically so this calculator also runs in client components
// (NutritionBreakdown); lib/taxonomy.ts reads the same file on the server.
import taxonomyData from "../content/taxonomy/ingredients.json";

/**
 * Macros for one taxonomy ingredient, per `per.amount` `per.unit`.
 * `source`: "usda" (checked against USDA FoodData Central), "label" (package
 * label), "stickymilk" (measured in our test kitchen), or "approx"
 * (reference-level estimate, not yet checked against USDA or a label).
 */
export interface IngredientNutrition {
  per: { amount: number; unit: string };
  calories: number;
  sugar_g: number;
  fat_g: number;
  protein_g: number;
  caffeine_mg: number;
  source: "usda" | "label" | "stickymilk" | "approx";
}

export interface ExcludedIngredient {
  item: string;
  reason: "not in taxonomy" | "no amount" | "unit not convertible";
}

export interface NutritionCoverage {
  /** Ingredients that count toward the totals (including ones that are
   *  intentionally zero, like water and ice) */
  counted: number;
  total: number;
  /** Ingredients left out of the totals, and why. Non-empty means the totals are a floor. */
  excluded: ExcludedIngredient[];
}

export interface NutritionBreakdown {
  calories: number;
  sugar_g: number;
  fat_g: number;
  protein_g: number;
  caffeine_mg: number;
  coverage: NutritionCoverage;
}

type TaxonomyNutritionRow = { id: string; nutrition?: IngredientNutrition | null };

/** item_id -> nutrition, or null for ingredients that are intentionally zero (water, ice). */
const NUTRITION = new Map<string, IngredientNutrition | null>(
  (taxonomyData as TaxonomyNutritionRow[]).map((e) => [e.id, e.nutrition ?? null])
);

// ---------------------------------------------------------------------------
// Units

/** Spelled-out and plural units recipes actually use -> the canonical unit. */
const UNIT_ALIASES: Record<string, string> = {
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp", tbs: "tbsp",
  ounce: "oz", ounces: "oz", "fl oz": "oz", "fl. oz": "oz", "fluid ounce": "oz", "fluid ounces": "oz",
  cups: "cup",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  gram: "g", grams: "g",
  pinches: "pinch",
  dashes: "dash",
  capsules: "capsule",
  pods: "pod",
  cookies: "cookie",
  scoops: "scoop",
  yolks: "yolk",
};

/** Generic count words: "16 piece ladyfingers" means 16 of the item's own count unit. */
const GENERIC_COUNT = new Set(["piece", "pieces", "each", "whole", "count"]);

/** Volume units in fluid ounces. A dash is 1/8 tsp; a pinch is 1/16 tsp. */
const VOLUME_IN_OZ: Record<string, number> = {
  oz: 1,
  tbsp: 1 / 2,
  tsp: 1 / 6,
  cup: 8,
  ml: 1 / 29.5735,
  dash: 1 / 48,
  pinch: 1 / 96,
};

/** Canonical form of a unit: lowercase, and "teaspoons" -> "tsp" etc. */
export function normalizeUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  // Lowercase, drop trailing periods ("TSPS." -> "tsps", "oz." -> "oz"), then map spellings
  const u = unit.toLowerCase().trim().replace(/\.+$/, "").replace(/\s+/g, " ");
  return UNIT_ALIASES[u] ?? u;
}

/**
 * How many `toUnit`s are in `amount` `fromUnit`s, or null when the units
 * can't be converted. Never guesses: an unknown conversion returns null so
 * the ingredient is reported as excluded instead of silently counted 1:1.
 * Grams only convert to grams — spoons to grams needs a per-ingredient
 * density, so a gram amount counts only when that ingredient's nutrition is
 * itself stated per gram.
 */
export function convertAmount(amount: number, fromUnit: string | undefined, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit)!;
  if (from === to) return amount;
  // A bare or generic count ("1 egg yolk", "16 piece ladyfingers") means the
  // nutrition's own count unit (cookie, yolk, capsule), never a volume or weight
  const toIsCount = VOLUME_IN_OZ[to] === undefined && to !== "g";
  if (from === undefined || GENERIC_COUNT.has(from)) return toIsCount ? amount : null;
  if (VOLUME_IN_OZ[from] !== undefined && VOLUME_IN_OZ[to] !== undefined) {
    return (amount * VOLUME_IN_OZ[from]) / VOLUME_IN_OZ[to];
  }
  return null;
}

/** Units allowed as a nutrition `per.unit` (checked by scripts/test-nutrition.ts). */
export function isKnownUnit(unit: string): boolean {
  const u = normalizeUnit(unit)!;
  return VOLUME_IN_OZ[u] !== undefined || u === "g" || Object.values(UNIT_ALIASES).includes(u);
}

// ---------------------------------------------------------------------------
// Calculator

/**
 * Estimates macros and caffeine for a preparation from the taxonomy's
 * nutrition data. Ingredients that can't be counted (free text, no amount,
 * unconvertible unit) are listed in `coverage.excluded` rather than counted
 * as zero, so the UI can say "≈ 210 cal · excludes 1 item".
 */
export function calculateNutrition(prep: Preparation, scale = 1): NutritionBreakdown {
  let calories = 0;
  let sugar = 0;
  let fat = 0;
  let protein = 0;
  let caffeine = 0;
  let counted = 0;
  const excluded: ExcludedIngredient[] = [];

  for (const ing of prep.ingredients) {
    const n = ing.item_id ? NUTRITION.get(ing.item_id) : undefined;
    if (n === undefined) {
      excluded.push({ item: ing.item, reason: "not in taxonomy" });
      continue;
    }
    if (n === null) {
      counted++; // intentionally zero (water, ice, salt, garnish wedges)
      continue;
    }
    // "a dash of cinnamon" / "a pinch of salt" with no number means one
    const amount = ing.amount ?? (/^(dash|pinch)$/.test(normalizeUnit(ing.unit) ?? "") ? 1 : undefined);
    if (amount === undefined) {
      excluded.push({ item: ing.item, reason: "no amount" });
      continue;
    }
    const inPerUnits = convertAmount(amount, ing.unit, n.per.unit);
    if (inPerUnits === null) {
      excluded.push({ item: ing.item, reason: "unit not convertible" });
      continue;
    }

    const portions = (inPerUnits / n.per.amount) * scale;
    calories += n.calories * portions;
    sugar += n.sugar_g * portions;
    fat += n.fat_g * portions;
    protein += n.protein_g * portions;
    // Caffeine scales with the amount too: two capsules are twice the caffeine
    caffeine += n.caffeine_mg * portions;
    counted++;
  }

  // If the recipe has an explicitly benchmarked/tested caffeine_mg, prioritize it
  if (prep.caffeine_mg != null) {
    caffeine = prep.caffeine_mg * scale;
  } else if (prep.caffeine_level === "decaf") {
    caffeine = Math.min(caffeine, 5 * scale);
  }

  return {
    calories: Math.round(calories),
    sugar_g: Math.round(sugar * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    protein_g: Math.round(protein * 10) / 10,
    caffeine_mg: Math.round(caffeine),
    coverage: { counted, total: prep.ingredients.length, excluded },
  };
}
