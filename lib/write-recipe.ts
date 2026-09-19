import "server-only";
import type { Ingredient, Preparation, Recipe } from "./types";

/**
 * Turns a validated `Recipe` into the exact bytes written to
 * `content/recipes/${slug}.json`. Keys are written in a fixed, deliberate
 * order (rather than whatever order the client happened to serialize them
 * in) so every new file reads consistently and `git diff` stays clean
 * across recipes. Existing hand-written files don't all match this order
 * exactly — this only governs new files going forward, nothing rewrites
 * old ones.
 */
export function toRecipeFileContents(recipe: Recipe): string {
  const ordered = {
    slug: recipe.slug,
    name: recipe.name,
    image: recipe.image,
    format: recipe.format,
    flavor_notes: recipe.flavor_notes,
    barista_note: recipe.barista_note,
    status: recipe.status,
    tags: recipe.tags,
    sweetness_level: recipe.sweetness_level,
    preparations: recipe.preparations.map(orderPreparation),
  };

  // JSON.stringify drops keys whose value is `undefined`, so optional
  // fields left unset simply don't appear — no explicit omission needed.
  return JSON.stringify(ordered, null, 2) + "\n";
}

function orderPreparation(prep: Preparation) {
  return {
    channel: prep.channel,
    roast_recommendation: prep.roast_recommendation,
    roast_note: prep.roast_note,
    tested_with: prep.tested_with,
    capsule_count: prep.capsule_count,
    caffeine_level: prep.caffeine_level,
    caffeine_mg: prep.caffeine_mg,
    barista_note: prep.barista_note,
    servings: prep.servings,
    yield_unit: prep.yield_unit,
    equipment: prep.equipment,
    dietary: prep.dietary,
    ingredients: prep.ingredients.map(orderIngredient),
    steps: prep.steps,
    difficulty: prep.difficulty,
    prep_time_minutes: prep.prep_time_minutes,
  };
}

function orderIngredient(ing: Ingredient) {
  return {
    amount: ing.amount,
    unit: ing.unit,
    secondary_amount: ing.secondary_amount,
    secondary_unit: ing.secondary_unit,
    item: ing.item,
    item_id: ing.item_id,
    notes: ing.notes,
    display: ing.display,
    scaling: ing.scaling,
    optional: ing.optional,
    group: ing.group,
  };
}
