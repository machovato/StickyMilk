import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isKnownUnit, type IngredientNutrition } from "./nutrition";

const TAXONOMY_PATH = path.join(process.cwd(), "content", "taxonomy", "ingredients.json");

/**
 * A single canonical ingredient concept. Free-text `Ingredient.item` on a
 * recipe stays the real display string; `Ingredient.item_id` optionally
 * links to one of these. `aliases` are the exact raw `item` strings across
 * the 14 core recipes that map to this concept (case/phrasing variants like
 * "ice" vs "Ice", or state-qualified Cometeer capsule descriptions) — used
 * for the New Recipe form's autocomplete/backfill matching, not rendered.
 */
export interface IngredientTaxonomyEntry {
  id: string;
  name: string;
  category: string;
  allergens: string[];
  aliases: string[];
  /** Suggested unit for the form's autofill — a convenience default the
   *  author can always override, not a constraint. Grounded in the unit
   *  actually used for this ingredient across the core recipes; omitted
   *  where usage doesn't settle on one (e.g. "ice", sometimes "cup",
   *  sometimes unitless). */
  default_unit?: string;
  /** Macros per `per.amount` `per.unit`, or null when the ingredient is
   *  intentionally zero (water, ice) — then `nutrition_note` says why.
   *  Required: a missing value would silently count as zero. */
  nutrition: IngredientNutrition | null;
  nutrition_note?: string;
}

let cache: IngredientTaxonomyEntry[] | null = null;

function validateEntry(v: unknown, index: number): asserts v is IngredientTaxonomyEntry {
  if (typeof v !== "object" || v === null) {
    throw new Error(`content/taxonomy/ingredients.json[${index}] must be an object`);
  }
  const e = v as Record<string, unknown>;
  const bad: string[] = [];
  if (typeof e.id !== "string" || e.id.trim() === "") bad.push("`id`");
  if (typeof e.name !== "string" || e.name.trim() === "") bad.push("`name`");
  if (typeof e.category !== "string" || e.category.trim() === "") bad.push("`category`");
  if (!Array.isArray(e.allergens) || e.allergens.some((a) => typeof a !== "string")) bad.push("`allergens`");
  if (!Array.isArray(e.aliases) || e.aliases.some((a) => typeof a !== "string")) bad.push("`aliases`");
  if (e.default_unit !== undefined && typeof e.default_unit !== "string") bad.push("`default_unit`");
  if (e.nutrition === undefined) {
    bad.push("`nutrition` (required; use null plus `nutrition_note` for zero-calorie items)");
  } else if (e.nutrition === null) {
    if (typeof e.nutrition_note !== "string" || !e.nutrition_note.trim()) bad.push("`nutrition_note` (required when nutrition is null)");
  } else {
    const n = e.nutrition as Record<string, unknown>;
    const per = n.per as { amount?: unknown; unit?: unknown } | undefined;
    if (!per || typeof per.amount !== "number" || per.amount <= 0 || typeof per.unit !== "string" || !isKnownUnit(per.unit)) {
      bad.push("`nutrition.per` (positive amount and a known unit)");
    }
    for (const k of ["calories", "sugar_g", "fat_g", "protein_g", "caffeine_mg"]) {
      if (typeof n[k] !== "number" || (n[k] as number) < 0) bad.push(`\`nutrition.${k}\``);
    }
    if (!["usda", "label", "stickymilk", "approx"].includes(n.source as string)) bad.push("`nutrition.source`");
  }
  if (bad.length > 0) {
    throw new Error(`content/taxonomy/ingredients.json[${index}] is invalid: ${bad.join(", ")}`);
  }
}

/** Reads and fail-fast-validates the ingredient taxonomy. Cached per server
 *  process, same as `getAllRecipes()` — there's no separate invalidation
 *  hook for it yet because nothing writes to this file at runtime (the New
 *  Recipe form only reads it). */
export function getIngredientTaxonomy(): IngredientTaxonomyEntry[] {
  if (process.env.NODE_ENV !== "development" && cache) return cache;

  const raw = readFileSync(TAXONOMY_PATH, "utf-8");
  const candidate: unknown = JSON.parse(raw);
  if (!Array.isArray(candidate)) {
    throw new Error("content/taxonomy/ingredients.json must be a JSON array");
  }
  candidate.forEach((entry, i) => validateEntry(entry, i));

  const ids = new Set<string>();
  for (const entry of candidate as IngredientTaxonomyEntry[]) {
    if (ids.has(entry.id)) {
      throw new Error(`content/taxonomy/ingredients.json has a duplicate id: "${entry.id}"`);
    }
    ids.add(entry.id);
  }

  cache = candidate as IngredientTaxonomyEntry[];
  return cache;
}

/** Clears the in-process ingredient taxonomy cache. */
export function invalidateTaxonomyCache(): void {
  cache = null;
}

/** Fresh set of valid ids — used to structurally re-check a submitted
 *  `item_id` before writing, mirroring `recipeSlugExists`'s role for slugs. */
export function ingredientTaxonomyIds(): Set<string> {
  return new Set(getIngredientTaxonomy().map((e) => e.id));
}
