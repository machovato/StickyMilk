export type RecipeFormat =
  | "hot"
  | "iced"
  | "mocktail"
  | "cocktail"
  | "affogato"
  | "baking";

export type Channel = "cometeer" | "nespresso" | "instant";

export type CaffeineLevel = "full" | "half" | "decaf";

export type Difficulty = "easy" | "medium" | "advanced";

export type RecipeStatus = "draft" | "needs_testing" | "verified";

/**
 * Trust & testing hierarchy for a specific channel preparation.
 * Never claims physical validation when a drink is a calculated conversion.
 */
export type ProvenanceStatus = "original" | "adapted" | "tested";

/**
 * Origin classification of a recipe:
 * - vendor: High baseline trust (roasters/equipment makers like Nespresso, Cometeer, Starbucks)
 * - creator: Viral/social concepts (TikTok, Instagram, YouTube)
 * - editorial: StickyMilk original development
 */
export type SourceType = "vendor" | "creator" | "editorial";

export interface RecipeSource {
  type: SourceType;
  name: string;
  handle?: string;
  platform?: string;
  url?: string;
  avatar?: string;
}

/**
 * Sweetness/body of the finished drink itself (not any one preparation) —
 * this is StickyMilk, so how sweet/creamy something reads is a primary
 * discovery axis alongside format and mood.
 */
export type SweetnessLevel = "none" | "subtle" | "rich_sweet" | "dessert";

/**
 * Safety/diet-relevant facts about a specific preparation — kept separate
 * from `tags` (mood/context) on purpose. A mood-tag list is editorial and
 * fuzzy; this one someone might actually rely on, so it stays a fixed,
 * reviewable set instead of getting lost among "summer"/"cozy"/etc.
 */
export type DietaryTag =
  | "dairy-free"
  | "vegan-adaptable"
  | "contains-alcohol"
  | "decaf-friendly";

/**
 * How an ingredient's `amount` behaves when a recipe is scaled up/down.
 * Not consumed by the scaler yet (that's still a straight `amount * scale`
 * multiply for everything) — this is schema groundwork so future scaling
 * logic has real per-ingredient data to read instead of guessing from the
 * unit string. `linear` = ordinary proportional scaling (most ingredients);
 * `discrete` = rounds to whole units instead of fractional (e.g. capsules,
 * eggs); `none` = doesn't scale at all (e.g. "pinch of salt", "ice").
 */
export type IngredientScaling = "linear" | "discrete" | "none";

/**
 * A single ingredient line. `amount` is a plain number (halves/thirds
 * included, e.g. 0.5, 0.333) so the portion scaler can multiply it —
 * `unit`/`item`/`notes` stay display-only. Items with no real quantity
 * ("Ice", "Pinch of salt", "Grapefruit wedge") just omit `amount`/`unit`
 * and don't scale.
 */
export interface Ingredient {
  amount?: number;
  unit?: string;
  /**
   * A second quantity shown alongside the primary one — a real conversion
   * or per-unit yield (e.g. 3 oz hot water ≈ 90 ml; 1 Cometeer capsule =
   * 26 g extract), not an independent fact. Scales by the exact same
   * multiplier as `amount` (both are the true value at 1x), so it's always
   * correct at any portion — this exists specifically so a fact like "26 g
   * extract" or "40 ml" never has to be hand-typed into `notes`, where it
   * would silently go stale the moment someone scales the recipe. Only set
   * this when `secondary_amount` is genuinely proportional to `amount` in
   * real life; a one-off comparison ("stands in for a 1 oz espresso") is
   * not proportional and stays in `notes` instead. Requires `amount` to
   * also be set.
   */
  secondary_amount?: number;
  secondary_unit?: string;
  item: string;
  /** Links this line to a canonical entry in `content/taxonomy/ingredients.json`
   *  (see `lib/taxonomy.ts`) — optional, additive. `item` stays the real
   *  display string; `item_id` is a convenience for repeatable
   *  filtering/search later and for the New Recipe form's unit/name
   *  autofill. A recipe with no matching taxonomy concept (or a compound
   *  "X or Y" alternative) simply omits it. */
  item_id?: string;
  notes?: string;
  /** Pre-composed display override (e.g. "a splash") for when amount/unit don't fit a clean number. Not consumed by any UI yet. */
  display?: string;
  /** See `IngredientScaling`. Not consumed by the scaler yet. */
  scaling?: IngredientScaling;
  /** Marks a "if you have it" ingredient. Not consumed by any UI yet. */
  optional?: boolean;
  /** Free-text grouping label (e.g. "For the base", "For the topping"). Not consumed by any UI yet. */
  group?: string;
}

export type RoastRecommendation = "light" | "medium" | "dark";

export interface Preparation {
  channel: Channel;
  /**
   * A roast-family nudge — advisory, never a requirement (nobody should
   * read this and think the recipe doesn't work without it). Set only
   * when there's a real, statable flavor-pairing reason (see
   * `roast_note`) — most preps should have neither this nor `roast_note`
   * at all. Never a specific brand/blend; that's `tested_with`.
   */
  roast_recommendation?: RoastRecommendation;
  /**
   * Why the recommendation helps, in one short phrase — required whenever
   * `roast_recommendation` is set (a bucket with no stated reason is
   * exactly the arbitrary-tagging problem this field exists to avoid).
   * Never present without `roast_recommendation`.
   */
  roast_note?: string;
  /**
   * Optional citation of the specific product actually used when this
   * recipe was written/tested — craft provenance, not a requirement.
   * Independent of `roast_recommendation`/`roast_note`: a recipe can cite
   * a product without a roast recommendation (e.g. a future recipe built
   * specifically around one capsule), or vice versa.
   */
  tested_with?: string;
  /** Cometeer only */
  capsule_count?: number;
  caffeine_level: CaffeineLevel;
  /**
   * Milligrams of caffeine for this preparation *at 1x* (the recipe's base
   * `servings`) — a real, scalable number, unlike the free-text `notes` on
   * an ingredient line (which never scale). Optional: only set where a
   * source actually states a figure — never estimated or inferred from
   * `caffeine_level` alone. For a multi-capsule prep this is the total for
   * the whole batch, not per-capsule (e.g. two half-caf capsules → the
   * combined total, not doubled naively).
   */
  caffeine_mg?: number;
  ingredients: Ingredient[];
  steps: string[];
  difficulty: Difficulty;
  prep_time_minutes: number;
  /** How many `yield_unit` this ingredient list/step list makes at 1x. */
  servings: number;
  /** What `servings` counts, for recipes that aren't a single drink pour — e.g. "cookies", "servings", "bars". Omit to fall back to "serving(s)". */
  yield_unit?: string;
  /** Notable tools beyond basic glassware/spoons — e.g. "blender", "cocktail shaker". Omit for trivial stir-and-serve drinks. */
  equipment?: string[];
  dietary?: DietaryTag[];
  /**
   * Provenance of this specific channel preparation:
   * - "original": The baseline formulation developed by the recipe's original author/source.
   * - "adapted": StickyMilk's calculated conversion for this coffee channel.
   * - "tested": Formally brewed, tasted, and approved by StickyMilk.
   */
  provenance?: ProvenanceStatus;
  /**
   * For Nespresso preparations: denotes whether formulated for Vertuo (e.g. double espresso 80ml)
   * or Original Line (standard 19-bar single espresso 40ml).
   */
  nespresso_system?: "vertuo" | "original";
  /**
   * An optional, high-value craft or technique insight from the barista or creator
   * (e.g. "Add a tiny pinch of salt to round out bitterness", or a creamer shortcut).
   */
  barista_note?: string;
}

export interface Promo {
  preparation_channel: Channel;
  headline: string;
  link: string;
  active: boolean;
}

export interface Recipe {
  slug: string;
  name: string;
  /** Path under /public, e.g. "/recipes/ca-phe-sua-da.jpg". Omit to fall back to a stylized placeholder. */
  image?: string;
  format: RecipeFormat;
  /** Shared across all channels — this is "the drink," independent of how it's made. */
  flavor_notes: string;
  /** Universal craft or sensory technique note shared across all channels for this drink. */
  barista_note?: string;
  status: RecipeStatus;
  /** Source attribution: where the recipe originated (vendor, creator, or editorial). */
  source?: RecipeSource;
  /** Mood/context/occasion facets for discovery, e.g. "summer", "date-night", "quick-fix". Freeform, editor-curated — not a fixed enum. */
  tags: string[];
  sweetness_level: SweetnessLevel;
  /**
   * Only channels that actually have written content. A channel with no
   * preparation here means it hasn't been written yet — never fabricate one.
   */
  preparations: Preparation[];
  promo?: Promo;
  /** Data-quality flags carried over from seed conversion, surfaced in the UI rather than hidden. */
  data_issues?: string[];
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  cometeer: "Cometeer",
  nespresso: "Nespresso",
  instant: "Instant",
};

export const FORMAT_LABELS: Record<RecipeFormat, string> = {
  hot: "Hot",
  iced: "Iced",
  mocktail: "Mocktail",
  cocktail: "Cocktail",
  affogato: "Affogato",
  baking: "Baking",
};

export const STATUS_LABELS: Record<RecipeStatus, string> = {
  draft: "Draft",
  needs_testing: "Needs testing",
  verified: "Verified",
};

export const PROVENANCE_LABELS: Record<ProvenanceStatus, string> = {
  original: "Original Recipe",
  adapted: "SM Adapted",
  tested: "SM Tested",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  vendor: "Coffee Vendor",
  creator: "Creator / Social",
  editorial: "StickyMilk Editorial",
};

export const SWEETNESS_LABELS: Record<SweetnessLevel, string> = {
  none: "Not sweet",
  subtle: "Subtly sweet",
  rich_sweet: "Rich & sweet",
  dessert: "Dessert-level",
};

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  "dairy-free": "Dairy-free",
  "vegan-adaptable": "Vegan-adaptable",
  "contains-alcohol": "Contains alcohol",
  "decaf-friendly": "Decaf-friendly",
};
