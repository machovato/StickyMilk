/**
 * Canonical recipe validation — the one place that knows what a valid
 * `Recipe` looks like. Both the content reader (`lib/recipes.ts`) and the
 * New Recipe form's Server Action call into this file, so they can never
 * quietly drift into checking different rules. They're allowed to *react*
 * to the results differently (the reader throws a file-named error and
 * fails the request; the form maps errors onto specific fields and lets
 * the author fix them) — but the rules themselves live in exactly one
 * place.
 *
 * This is deliberately NOT a claim that schema drift becomes impossible
 * forever. It's one canonical path today; when the data model changes,
 * this file changes once; anyone consuming a `Recipe` still recomputes
 * `errors` from `unknown` input, so nothing here inspects TypeScript types
 * at runtime (they don't exist at runtime) — it inspects whatever JSON
 * actually showed up.
 */
import {
  CHANNEL_LABELS,
  CaffeineLevel,
  Channel,
  DIETARY_LABELS,
  DietaryTag,
  Difficulty,
  FORMAT_LABELS,
  Ingredient,
  PROVENANCE_LABELS,
  Preparation,
  ProvenanceStatus,
  Recipe,
  RecipeFormat,
  RecipeStatus,
  SOURCE_TYPE_LABELS,
  SWEETNESS_LABELS,
  SourceType,
  SweetnessLevel,
} from "./types";

export interface FieldError {
  /** Dot/bracket path matching the shape of the data, e.g.
   *  `preparations[0].ingredients[2].item` — usable both as a bullet in a
   *  thrown error message and as a lookup key for a specific form field. */
  path: string;
  message: string;
}

const VALID_FORMATS = Object.keys(FORMAT_LABELS) as RecipeFormat[];
const VALID_SWEETNESS = Object.keys(SWEETNESS_LABELS) as SweetnessLevel[];
const VALID_CHANNELS = Object.keys(CHANNEL_LABELS) as Channel[];
const VALID_DIETARY = Object.keys(DIETARY_LABELS) as DietaryTag[];
const VALID_PROVENANCE = Object.keys(PROVENANCE_LABELS) as ProvenanceStatus[];
const VALID_SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];
const VALID_NESPRESSO_SYSTEMS = ["vertuo", "original"] as const;
const VALID_CAFFEINE: CaffeineLevel[] = ["full", "half", "decaf"];
const VALID_DIFFICULTY: Difficulty[] = ["easy", "medium", "advanced"];
const VALID_STATUS: RecipeStatus[] = ["draft", "needs_testing", "verified"];
const VALID_SCALING = ["linear", "discrete", "none"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateIngredient(
  v: unknown,
  path: string,
  errors: FieldError[],
  knownIngredientIds?: Set<string>
): void {
  if (!isRecord(v)) {
    errors.push({ path, message: "must be an object ({item, amount?, unit?, …}), not a plain string" });
    return;
  }
  if (typeof v.item !== "string" || v.item.trim() === "") {
    errors.push({ path: `${path}.item`, message: "missing `item`" });
  }
  if (v.item_id !== undefined) {
    if (typeof v.item_id !== "string" || v.item_id.trim() === "") {
      errors.push({ path: `${path}.item_id`, message: "`item_id` must be a non-empty string when present" });
    } else if (knownIngredientIds && !knownIngredientIds.has(v.item_id)) {
      errors.push({
        path: `${path}.item_id`,
        message: `"${v.item_id}" doesn't match any entry in content/taxonomy/ingredients.json`,
      });
    }
  }
  if (v.amount !== undefined && typeof v.amount !== "number") {
    errors.push({ path: `${path}.amount`, message: "`amount` must be a number when present" });
  }
  if (v.unit !== undefined && typeof v.unit !== "string") {
    errors.push({ path: `${path}.unit`, message: "`unit` must be a string when present" });
  }
  if (v.secondary_amount !== undefined) {
    if (typeof v.secondary_amount !== "number") {
      errors.push({ path: `${path}.secondary_amount`, message: "must be a number when present" });
    }
    if (v.amount === undefined) {
      errors.push({
        path: `${path}.secondary_amount`,
        message: "requires `amount` to also be set — it scales together with it",
      });
    }
  }
  if (v.secondary_unit !== undefined && typeof v.secondary_unit !== "string") {
    errors.push({ path: `${path}.secondary_unit`, message: "must be a string when present" });
  }
  if (v.notes !== undefined && typeof v.notes !== "string") {
    errors.push({ path: `${path}.notes`, message: "`notes` must be a string when present" });
  }
  if (v.display !== undefined && typeof v.display !== "string") {
    errors.push({ path: `${path}.display`, message: "`display` must be a string when present" });
  }
  if (v.optional !== undefined && typeof v.optional !== "boolean") {
    errors.push({ path: `${path}.optional`, message: "`optional` must be a boolean when present" });
  }
  if (v.group !== undefined && typeof v.group !== "string") {
    errors.push({ path: `${path}.group`, message: "`group` must be a string when present" });
  }
  if (
    v.scaling !== undefined &&
    !(VALID_SCALING as readonly unknown[]).includes(v.scaling)
  ) {
    errors.push({
      path: `${path}.scaling`,
      message: `\`scaling\` must be one of ${VALID_SCALING.join(", ")} when present`,
    });
  }
}

function validatePreparation(
  v: unknown,
  path: string,
  errors: FieldError[],
  knownIngredientIds?: Set<string>
): void {
  if (!isRecord(v)) {
    errors.push({ path, message: "must be an object" });
    return;
  }
  if (!VALID_CHANNELS.includes(v.channel as Channel)) {
    errors.push({ path: `${path}.channel`, message: `invalid channel (got ${JSON.stringify(v.channel)})` });
  }
  if (!VALID_CAFFEINE.includes(v.caffeine_level as CaffeineLevel)) {
    errors.push({
      path: `${path}.caffeine_level`,
      message: `missing or invalid caffeine_level (got ${JSON.stringify(v.caffeine_level)})`,
    });
  }
  if (!VALID_DIFFICULTY.includes(v.difficulty as Difficulty)) {
    errors.push({
      path: `${path}.difficulty`,
      message: `missing or invalid difficulty (got ${JSON.stringify(v.difficulty)})`,
    });
  }
  if (typeof v.prep_time_minutes !== "number" || v.prep_time_minutes <= 0) {
    errors.push({ path: `${path}.prep_time_minutes`, message: "must be a positive number" });
  }
  if (typeof v.servings !== "number" || v.servings <= 0) {
    errors.push({ path: `${path}.servings`, message: "must be a positive number" });
  }
  if (v.yield_unit !== undefined && typeof v.yield_unit !== "string") {
    errors.push({ path: `${path}.yield_unit`, message: "must be a string when present" });
  }
  const VALID_ROAST_RECOMMENDATION = ["light", "medium", "dark"];
  if (
    v.roast_recommendation !== undefined &&
    !VALID_ROAST_RECOMMENDATION.includes(v.roast_recommendation as string)
  ) {
    errors.push({
      path: `${path}.roast_recommendation`,
      message: `must be one of ${VALID_ROAST_RECOMMENDATION.join(", ")} when present`,
    });
  }
  if (v.roast_note !== undefined && typeof v.roast_note !== "string") {
    errors.push({ path: `${path}.roast_note`, message: "must be a string when present" });
  }
  if (v.roast_recommendation !== undefined && !v.roast_note) {
    errors.push({
      path: `${path}.roast_note`,
      message: "required when roast_recommendation is set — state the reason, not just the bucket",
    });
  }
  if (v.roast_note !== undefined && v.roast_recommendation === undefined) {
    errors.push({
      path: `${path}.roast_note`,
      message: "roast_note has nothing to explain without roast_recommendation",
    });
  }
  if (v.tested_with !== undefined && typeof v.tested_with !== "string") {
    errors.push({ path: `${path}.tested_with`, message: "must be a string when present" });
  }
  if (v.capsule_count !== undefined && typeof v.capsule_count !== "number") {
    errors.push({ path: `${path}.capsule_count`, message: "must be a number when present" });
  }
  if (v.caffeine_mg !== undefined && (typeof v.caffeine_mg !== "number" || v.caffeine_mg < 0)) {
    errors.push({ path: `${path}.caffeine_mg`, message: "must be a non-negative number when present" });
  }
  if (v.equipment !== undefined) {
    if (!Array.isArray(v.equipment) || v.equipment.some((e) => typeof e !== "string")) {
      errors.push({ path: `${path}.equipment`, message: "must be an array of strings when present" });
    }
  }
  if (v.dietary !== undefined) {
    if (
      !Array.isArray(v.dietary) ||
      v.dietary.some((d) => !VALID_DIETARY.includes(d as DietaryTag))
    ) {
      errors.push({
        path: `${path}.dietary`,
        message: `must be an array from ${VALID_DIETARY.join(", ")} when present`,
      });
    }
  }
  if (v.barista_note !== undefined && typeof v.barista_note !== "string") {
    errors.push({ path: `${path}.barista_note`, message: "must be a string when present" });
  }
  if (
    v.provenance !== undefined &&
    !VALID_PROVENANCE.includes(v.provenance as ProvenanceStatus)
  ) {
    errors.push({
      path: `${path}.provenance`,
      message: `must be one of ${VALID_PROVENANCE.join(", ")} when present`,
    });
  }
  if (
    v.nespresso_system !== undefined &&
    !VALID_NESPRESSO_SYSTEMS.includes(v.nespresso_system as "vertuo" | "original")
  ) {
    errors.push({
      path: `${path}.nespresso_system`,
      message: `must be one of ${VALID_NESPRESSO_SYSTEMS.join(", ")} when present`,
    });
  }
  if (!Array.isArray(v.ingredients) || v.ingredients.length === 0) {
    errors.push({ path: `${path}.ingredients`, message: "must have at least one ingredient" });
  } else {
    v.ingredients.forEach((ing, i) =>
      validateIngredient(ing, `${path}.ingredients[${i}]`, errors, knownIngredientIds)
    );
  }
  if (
    !Array.isArray(v.steps) ||
    v.steps.length === 0 ||
    v.steps.some((s) => typeof s !== "string" || s.trim() === "")
  ) {
    errors.push({ path: `${path}.steps`, message: "must have at least one non-empty step" });
  }
}

/**
 * Structural validation only — does NOT check that `slug` matches a
 * filename (the reader's concern) or that a slug is available (the
 * writer's concern, and one that needs a fresh directory listing, not a
 * pure function). Both of those stay as a thin extra check in the caller.
 *
 * `knownIngredientIds`, when passed, additionally checks that every
 * `item_id` present matches a real taxonomy entry. This function stays
 * pure either way — it never reads `content/taxonomy/` itself; a caller
 * that cares about `item_id` membership (the reader, the writer) loads the
 * set once via `ingredientTaxonomyIds()` and passes it in. Omitting it just
 * skips that one check (structural shape of `item_id` is still validated).
 */
export function validateRecipeCandidate(
  candidate: unknown,
  knownIngredientIds?: Set<string>
): FieldError[] {
  const errors: FieldError[] = [];

  if (!isRecord(candidate)) {
    return [{ path: "", message: "recipe payload must be an object" }];
  }

  if (typeof candidate.slug !== "string" || candidate.slug.trim() === "") {
    errors.push({ path: "slug", message: "missing `slug`" });
  }
  if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
    errors.push({ path: "name", message: "missing `name`" });
  }
  if (candidate.image !== undefined && typeof candidate.image !== "string") {
    errors.push({ path: "image", message: "must be a string when present" });
  }
  if (!VALID_FORMATS.includes(candidate.format as RecipeFormat)) {
    errors.push({ path: "format", message: `missing or invalid format (got ${JSON.stringify(candidate.format)})` });
  }
  if (typeof candidate.flavor_notes !== "string" || candidate.flavor_notes.trim() === "") {
    errors.push({ path: "flavor_notes", message: "missing `flavor_notes`" });
  }
  if (candidate.barista_note !== undefined && typeof candidate.barista_note !== "string") {
    errors.push({ path: "barista_note", message: "must be a string when present" });
  }
  if (candidate.source !== undefined) {
    if (!isRecord(candidate.source)) {
      errors.push({ path: "source", message: "must be an object when present" });
    } else {
      if (!VALID_SOURCE_TYPES.includes(candidate.source.type as SourceType)) {
        errors.push({
          path: "source.type",
          message: `missing or invalid source type (must be one of ${VALID_SOURCE_TYPES.join(", ")})`,
        });
      }
      if (
        typeof candidate.source.name !== "string" ||
        candidate.source.name.trim() === ""
      ) {
        errors.push({ path: "source.name", message: "source name is required" });
      }
      if (
        candidate.source.handle !== undefined &&
        typeof candidate.source.handle !== "string"
      ) {
        errors.push({ path: "source.handle", message: "handle must be a string when present" });
      }
      if (
        candidate.source.platform !== undefined &&
        typeof candidate.source.platform !== "string"
      ) {
        errors.push({ path: "source.platform", message: "platform must be a string when present" });
      }
      if (
        candidate.source.url !== undefined &&
        typeof candidate.source.url !== "string"
      ) {
        errors.push({ path: "source.url", message: "url must be a string when present" });
      }
      if (
        candidate.source.avatar !== undefined &&
        typeof candidate.source.avatar !== "string"
      ) {
        errors.push({ path: "source.avatar", message: "avatar must be a string when present" });
      }
    }
  }
  if (candidate.variations !== undefined) {
    if (!Array.isArray(candidate.variations)) {
      errors.push({ path: "variations", message: "must be an array when present" });
    } else {
      candidate.variations.forEach((v, i) => {
        if (!isRecord(v)) {
          errors.push({ path: `variations[${i}]`, message: "must be an object" });
        } else {
          if (typeof v.slug !== "string" || v.slug.trim() === "") {
            errors.push({ path: `variations[${i}].slug`, message: "slug is required" });
          }
          if (typeof v.title !== "string" || v.title.trim() === "") {
            errors.push({ path: `variations[${i}].title`, message: "title is required" });
          }
          if (typeof v.twist !== "string" || v.twist.trim() === "") {
            errors.push({ path: `variations[${i}].twist`, message: "twist is required" });
          }
          if (v.url !== undefined && typeof v.url !== "string") {
            errors.push({ path: `variations[${i}].url`, message: "url must be a string when present" });
          }
          if (typeof v.thumbnail !== "string" || v.thumbnail.trim() === "") {
            errors.push({ path: `variations[${i}].thumbnail`, message: "thumbnail is required" });
          }
          if (!isRecord(v.creator) || typeof v.creator.name !== "string") {
            errors.push({ path: `variations[${i}].creator.name`, message: "creator name is required" });
          }
        }
      });
    }
  }
  if (!VALID_STATUS.includes(candidate.status as RecipeStatus)) {
    errors.push({ path: "status", message: `missing or invalid status (got ${JSON.stringify(candidate.status)})` });
  }
  if (!Array.isArray(candidate.tags) || candidate.tags.some((t) => typeof t !== "string")) {
    errors.push({ path: "tags", message: "must be an array of strings" });
  }
  if (!VALID_SWEETNESS.includes(candidate.sweetness_level as SweetnessLevel)) {
    errors.push({
      path: "sweetness_level",
      message: `missing or invalid sweetness_level (got ${JSON.stringify(candidate.sweetness_level)})`,
    });
  }
  if (!Array.isArray(candidate.preparations) || candidate.preparations.length === 0) {
    errors.push({ path: "preparations", message: "at least one preparation is required" });
  } else {
    candidate.preparations.forEach((prep, i) =>
      validatePreparation(prep, `preparations[${i}]`, errors, knownIngredientIds)
    );
  }

  return errors;
}

/** Only safe to call once `validateRecipeCandidate` returned no errors. */
export function asValidatedRecipe(candidate: unknown): Recipe {
  return candidate as Recipe;
}

export type { Recipe, Preparation, Ingredient };
