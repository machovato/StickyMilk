import type {
  CaffeineLevel,
  Channel,
  DietaryTag,
  Difficulty,
  IngredientScaling,
  ProvenanceStatus,
  Recipe,
  RecipeFormat,
  RecipeSource,
  RecipeStatus,
  RoastRecommendation,
  SourceType,
  SweetnessLevel,
} from "./types";
import { CHANNEL_LABELS } from "./types";
import { validateRecipeCandidate, type FieldError } from "./recipe-schema";

/** Fixed iteration order used everywhere a channel list needs one — the
 *  authoring form's field order, the `preparations[]` array the payload is
 *  built in, and the readiness indicator's index alignment all depend on
 *  this being the same order everywhere. */
export const CHANNEL_ORDER: Channel[] = ["cometeer", "nespresso", "instant"];

export function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export interface IngredientDraft {
  localId: string;
  /** Kept as a string in the form so a half-typed number ("1." while
   *  typing "1.5") doesn't get silently coerced or rounded mid-edit. */
  amount: string;
  unit: string;
  /** See `Ingredient.secondary_amount` — a real per-unit conversion that
   *  scales alongside `amount`, not free text. Leave blank unless it's a
   *  genuine proportional fact. */
  secondary_amount: string;
  secondary_unit: string;
  item: string;
  /** Set when the author picked (or an exact name match auto-filled) a
   *  taxonomy entry from `content/taxonomy/ingredients.json`. Cleared
   *  automatically if they then hand-edit `item` away from that entry's
   *  name — see `IngredientRowEditor`. */
  item_id: string;
  notes: string;
  display: string;
  scaling: IngredientScaling | "";
  optional: boolean;
  group: string;
}

export interface StepDraft {
  localId: string;
  text: string;
}

export interface RecipeSourceDraft {
  type: SourceType | "";
  name: string;
  handle: string;
  platform: string;
  url: string;
}

export function emptySourceDraft(): RecipeSourceDraft {
  return {
    type: "",
    name: "",
    handle: "",
    platform: "",
    url: "",
  };
}

export interface PreparationDraft {
  /** Provenance tier: original, adapted, or tested. */
  provenance: ProvenanceStatus | "";
  /** For Nespresso preparations: vertuo or original. */
  nespresso_system: "vertuo" | "original" | "";
  /** "" means no recommendation — matches the "most preps have neither" default. */
  roast_recommendation: RoastRecommendation | "";
  /** Required alongside roast_recommendation, blank otherwise — see `Preparation.roast_note`. */
  roast_note: string;
  /** Optional citation of what was actually used — independent of the two fields above. */
  tested_with: string;
  capsule_count: string;
  caffeine_level: CaffeineLevel | "";
  /** Milligrams at 1x — see `Preparation.caffeine_mg`. Leave blank unless a
   *  real source states a figure; never estimated from `caffeine_level`. */
  caffeine_mg: string;
  difficulty: Difficulty | "";
  prep_time_minutes: string;
  servings: string;
  yield_unit: string;
  equipment: string[];
  dietary: DietaryTag[];
  barista_note: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
}

export interface RecipeDraft {
  name: string;
  slug: string;
  /** Once the author edits the slug directly, auto-generation from the
   *  name stops overwriting it. */
  slugTouched: boolean;
  image: string;
  format: RecipeFormat | "";
  flavor_notes: string;
  barista_note: string;
  status: RecipeStatus;
  source: RecipeSourceDraft;
  tags: string[];
  sweetness_level: SweetnessLevel | "";
  preparations: Record<Channel, PreparationDraft | null>;
}

export function emptyIngredientDraft(): IngredientDraft {
  return {
    localId: newLocalId(),
    amount: "",
    unit: "",
    secondary_amount: "",
    secondary_unit: "",
    item: "",
    item_id: "",
    notes: "",
    display: "",
    scaling: "",
    optional: false,
    group: "",
  };
}

export function emptyStepDraft(): StepDraft {
  return { localId: newLocalId(), text: "" };
}

export function emptyPreparationDraft(): PreparationDraft {
  return {
    provenance: "adapted",
    nespresso_system: "",
    roast_recommendation: "",
    roast_note: "",
    tested_with: "",
    capsule_count: "",
    caffeine_level: "",
    caffeine_mg: "",
    difficulty: "",
    prep_time_minutes: "",
    servings: "",
    yield_unit: "",
    equipment: [],
    dietary: [],
    barista_note: "",
    ingredients: [emptyIngredientDraft()],
    steps: [emptyStepDraft()],
  };
}

/** Deep clone with fresh local ids — used by "duplicate to another channel"
 *  so editing the copy's ingredient rows never touches the source's rows. */
export function clonePreparationDraft(p: PreparationDraft): PreparationDraft {
  return {
    ...p,
    provenance: p.provenance,
    nespresso_system: p.nespresso_system,
    equipment: [...p.equipment],
    dietary: [...p.dietary],
    barista_note: p.barista_note,
    ingredients: p.ingredients.map((ing) => ({ ...ing, localId: newLocalId() })),
    steps: p.steps.map((s) => ({ ...s, localId: newLocalId() })),
  };
}

export function emptyRecipeDraft(): RecipeDraft {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    image: "",
    format: "",
    flavor_notes: "",
    barista_note: "",
    status: "draft",
    source: emptySourceDraft(),
    tags: [],
    sweetness_level: "",
    preparations: { cometeer: emptyPreparationDraft(), nespresso: null, instant: null },
  };
}

/** Parses a form-field string into a number when it looks like one, the
 *  original string when it doesn't (so schema validation reports a clear
 *  "must be a number" instead of the value silently becoming `null` via
 *  `JSON.stringify(NaN)`), or `undefined` when left blank. */
function numOrRaw(s: string): number | string | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}

function undefinedIfBlank(s: string): string | undefined {
  const t = s.trim();
  return t === "" ? undefined : t;
}

function ingredientToCandidate(ing: IngredientDraft) {
  return {
    amount: numOrRaw(ing.amount),
    unit: undefinedIfBlank(ing.unit),
    secondary_amount: numOrRaw(ing.secondary_amount),
    secondary_unit: undefinedIfBlank(ing.secondary_unit),
    item: ing.item.trim(),
    item_id: undefinedIfBlank(ing.item_id),
    notes: undefinedIfBlank(ing.notes),
    display: undefinedIfBlank(ing.display),
    scaling: ing.scaling === "" ? undefined : ing.scaling,
    optional: ing.optional ? true : undefined,
    group: undefinedIfBlank(ing.group),
  };
}

function preparationToCandidate(channel: Channel, prep: PreparationDraft) {
  return {
    channel,
    provenance: prep.provenance === "" ? undefined : prep.provenance,
    nespresso_system:
      channel === "nespresso" && prep.nespresso_system !== ""
        ? prep.nespresso_system
        : undefined,
    roast_recommendation: prep.roast_recommendation === "" ? undefined : prep.roast_recommendation,
    roast_note: undefinedIfBlank(prep.roast_note),
    tested_with: undefinedIfBlank(prep.tested_with),
    capsule_count: numOrRaw(prep.capsule_count),
    caffeine_level: prep.caffeine_level === "" ? undefined : prep.caffeine_level,
    caffeine_mg: numOrRaw(prep.caffeine_mg),
    difficulty: prep.difficulty === "" ? undefined : prep.difficulty,
    prep_time_minutes: numOrRaw(prep.prep_time_minutes),
    servings: numOrRaw(prep.servings),
    yield_unit: undefinedIfBlank(prep.yield_unit),
    equipment: prep.equipment.length > 0 ? prep.equipment : undefined,
    dietary: prep.dietary.length > 0 ? prep.dietary : undefined,
    barista_note: undefinedIfBlank(prep.barista_note),
    ingredients: prep.ingredients
      .filter((ing) => ing.item.trim() !== "")
      .map(ingredientToCandidate),
    steps: prep.steps.map((s) => s.text).filter((t) => t.trim() !== ""),
  };
}

/** Builds the same plain-object shape `validateRecipeCandidate` and the
 *  Server Action expect, straight from form state — no `Recipe` cast, so
 *  a half-filled draft can be validated (for the readiness indicator)
 *  without pretending it's already a valid `Recipe`. */
export function draftToCandidate(draft: RecipeDraft): unknown {
  const preparations = CHANNEL_ORDER.filter((c) => draft.preparations[c] !== null).map((c) =>
    preparationToCandidate(c, draft.preparations[c] as PreparationDraft)
  );

  const source =
    draft.source &&
    draft.source.name.trim() !== "" &&
    draft.source.type !== ""
      ? {
          type: draft.source.type,
          name: draft.source.name.trim(),
          handle: undefinedIfBlank(draft.source.handle),
          platform: undefinedIfBlank(draft.source.platform),
          url: undefinedIfBlank(draft.source.url),
        }
      : undefined;

  return {
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    image: undefinedIfBlank(draft.image),
    format: draft.format === "" ? undefined : draft.format,
    flavor_notes: draft.flavor_notes.trim(),
    barista_note: undefinedIfBlank(draft.barista_note),
    status: draft.status,
    source,
    tags: draft.tags,
    sweetness_level: draft.sweetness_level === "" ? undefined : draft.sweetness_level,
    preparations,
  };
}

/** Converts an existing stored Recipe into a full RecipeDraft for editing. */
export function recipeToDraft(recipe: Recipe): RecipeDraft {
  const preparations: Record<Channel, PreparationDraft | null> = {
    cometeer: null,
    nespresso: null,
    instant: null,
  };

  for (const prep of recipe.preparations) {
    preparations[prep.channel] = {
      provenance: prep.provenance ?? "",
      nespresso_system: prep.nespresso_system ?? "",
      roast_recommendation: prep.roast_recommendation ?? "",
      roast_note: prep.roast_note ?? "",
      tested_with: prep.tested_with ?? "",
      capsule_count: prep.capsule_count != null ? String(prep.capsule_count) : "",
      caffeine_level: prep.caffeine_level,
      caffeine_mg: prep.caffeine_mg != null ? String(prep.caffeine_mg) : "",
      difficulty: prep.difficulty,
      prep_time_minutes: String(prep.prep_time_minutes),
      servings: String(prep.servings),
      yield_unit: prep.yield_unit ?? "",
      equipment: prep.equipment ? [...prep.equipment] : [],
      dietary: prep.dietary ? [...prep.dietary] : [],
      barista_note: prep.barista_note ?? "",
      ingredients: prep.ingredients.map((ing) => ({
        localId: newLocalId(),
        amount: ing.amount != null ? String(ing.amount) : "",
        unit: ing.unit ?? "",
        secondary_amount: ing.secondary_amount != null ? String(ing.secondary_amount) : "",
        secondary_unit: ing.secondary_unit ?? "",
        item: ing.item,
        item_id: ing.item_id ?? "",
        notes: ing.notes ?? "",
        display: ing.display ?? "",
        scaling: ing.scaling ?? "",
        optional: Boolean(ing.optional),
        group: ing.group ?? "",
      })),
      steps: prep.steps.map((s) => ({
        localId: newLocalId(),
        text: s,
      })),
    };
  }

  const source: RecipeSourceDraft = recipe.source
    ? {
        type: recipe.source.type,
        name: recipe.source.name,
        handle: recipe.source.handle ?? "",
        platform: recipe.source.platform ?? "",
        url: recipe.source.url ?? "",
      }
    : emptySourceDraft();

  return {
    name: recipe.name,
    slug: recipe.slug,
    slugTouched: true,
    image: recipe.image ?? "",
    format: recipe.format,
    flavor_notes: recipe.flavor_notes,
    barista_note: recipe.barista_note ?? "",
    status: recipe.status,
    source,
    tags: [...recipe.tags],
    sweetness_level: recipe.sweetness_level,
    preparations,
  };
}

export interface ReadinessItem {
  label: string;
  state: "ok" | "warning" | "neutral";
}

/**
 * Derives the "Recipe readiness" checklist straight from the same
 * canonical validator the Server Action uses — deliberately not a
 * separate scoring system. Buckets errors by which part of the payload
 * they belong to (recipe-level fields vs. a specific enabled channel).
 */
export function computeReadiness(draft: RecipeDraft): ReadinessItem[] {
  const candidate = draftToCandidate(draft) as { preparations: unknown[] };
  const errors = validateRecipeCandidate(candidate);

  const basicsHasErrors = errors.some((e) => !e.path.startsWith("preparations"));
  const items: ReadinessItem[] = [
    { label: "Basics", state: basicsHasErrors ? "warning" : "ok" },
  ];

  let index = 0;
  for (const channel of CHANNEL_ORDER) {
    const enabled = draft.preparations[channel] !== null;
    if (!enabled) {
      items.push({ label: CHANNEL_LABELS[channel], state: "neutral" });
      continue;
    }
    const prefix = `preparations[${index}]`;
    const channelHasErrors = errors.some((e) => e.path.startsWith(prefix));
    items.push({ label: CHANNEL_LABELS[channel], state: channelHasErrors ? "warning" : "ok" });
    index++;
  }

  return items;
}

export function isReadyToSave(draft: RecipeDraft): boolean {
  const errors = validateRecipeCandidate(draftToCandidate(draft));
  return errors.length === 0;
}

/** Narrows a server-returned error list down to one path prefix (e.g. a
 *  specific preparation) and strips the prefix so the caller can match on
 *  the field's own relative path ("ingredients[2].item" rather than
 *  "preparations[0].ingredients[2].item"). */
export function errorsWithPrefix(errors: FieldError[], prefix: string): FieldError[] {
  return errors
    .filter((e) => e.path === prefix || e.path.startsWith(`${prefix}.`))
    .map((e) => ({ ...e, path: e.path === prefix ? "" : e.path.slice(prefix.length + 1) }));
}

export function fieldMessage(errors: FieldError[], path: string): string | undefined {
  return errors.find((e) => e.path === path)?.message;
}
