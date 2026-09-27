import type { PhotoBrief, Recipe } from "../types";
// The tunable style lives in content/brand/photo-style.json (see its _about note).
import style from "../../content/brand/photo-style.json";

/**
 * Builds the image prompt for a recipe photo. Pure (no I/O) so it's testable.
 *
 * Every photo = one fixed HOUSE STYLE (so the whole vault looks like one
 * photographer, one kitchen) + a VESSEL for the drink type + the drink's
 * MONEY-SHOT moment + a fresh mix of BACKGROUND STAGING (so no two photos
 * are the same shot with a different drink). Ingredient props (honey jar
 * for honey, cinnamon sticks for cinnamon...) come from the recipe itself.
 *
 * When the recipe has an art-director brief (lib/photo/brief.ts), the brief's
 * tell, vessel, colors and story prop replace the keyword-based guesses. An
 * optional one-off note from the editor ("put it in an 8-ball glass") is
 * added as art direction for that render only.
 */

export type Vessel = keyof typeof style.vessels;
export type Moment = keyof typeof style.moments;

export interface PhotoPlan {
  vessel: Vessel;
  /** The money-shot rule used, or "brief" / "brief: before" / "brief: after" */
  moment: Moment | string | null;
  /** Props suggested by the recipe's own ingredients (max 2) */
  ingredientProps: string[];
  /** Generic kitchen staging, picked fresh per render (fills up to 3 props total) */
  background: string[];
  /** Where the drink and props sit in the frame, also varied per render */
  composition: string;
  prompt: string;
}

const MAX_PROPS = 3;
const MAX_INGREDIENT_PROPS = 2;

/** Small seeded random generator (mulberry32), so the same seed always gives the same staging (testable). */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Unbiased shuffle (Fisher-Yates) driven by the seeded generator. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Everything the recipe says, lowercased, for keyword checks. */
function recipeText(recipe: Recipe): string {
  const prep = recipe.preparations[0];
  return [
    recipe.name,
    recipe.format,
    ...recipe.tags,
    ...(prep?.ingredients.map((i) => i.item) ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function hasMilk(recipe: Recipe): boolean {
  const prep = recipe.preparations[0];
  return (prep?.ingredients ?? []).some((i) =>
    /\b(milk|cream|half.and.half|creamer|oat|almond|soy|protein shake)\b/i.test(i.item)
  );
}

/** Picks the cup or glass. Every drink type always gets the same vessel. */
export function chooseVessel(recipe: Recipe): Vessel {
  const text = recipeText(recipe);
  if (recipe.format === "affogato" || /affogato/.test(text)) return "dessert";
  if (/\b(tonic|soda|sparkling|cola)\b/.test(text) || recipe.format === "cocktail") return "short";
  if (recipe.format === "hot") return hasMilk(recipe) ? "hot_milk" : "hot_black";
  return "iced";
}

/** Picks the drink's "money shot": what makes this particular drink look irresistible. */
export function chooseMoment(recipe: Recipe): Moment | null {
  const text = recipeText(recipe);
  const prep = recipe.preparations[0];
  const steps = (prep?.steps ?? []).join(" ").toLowerCase();

  if (recipe.format === "affogato" || /affogato/.test(text)) return "affogato";
  if (/\b(tonic|sparkling|soda)\b/.test(text)) return "layered_tonic";
  if (recipe.tags.includes("cold-foam") || /cold foam/.test(text)) return "cold_foam";
  if (/condensed milk/.test(text) && recipe.format !== "hot") return "condensed_milk";
  if (recipe.format === "hot") {
    if (!hasMilk(recipe)) return "black_coffee";
    return /cappuccino/.test(text) ? "cappuccino" : "latte_art";
  }
  if (!hasMilk(recipe)) return null;
  // Iced + milk: when the recipe pours the coffee OVER the milk, show the swirl
  // (everyone's favorite shot); otherwise soft marbled layers.
  const coffeeOverMilk =
    /pour[^.]*(coffee|espresso|shot|concentrate)[^.]*over[^.]*milk/.test(steps) || /over the iced milk/.test(steps);
  return coffeeOverMilk ? "pour_swirl" : "iced_layers";
}

/** Props that echo the recipe's own ingredients (a honey jar for honey...), in ingredient order. */
export function ingredientProps(recipe: Recipe): string[] {
  const items = (recipe.preparations[0]?.ingredients ?? []).map((i) => i.item.toLowerCase());
  const props: string[] = [];
  for (const item of items) {
    const rule = style.ingredient_props.find((r) => r.match.some((m) => item.includes(m)));
    if (rule && !props.includes(rule.prop)) props.push(rule.prop);
    if (props.length === MAX_INGREDIENT_PROPS) break;
  }
  return props;
}

/** Visible drink description: name, taste line, and toppings/garnish worth showing. */
function drinkDescription(recipe: Recipe): string {
  const prep = recipe.preparations[0];
  const garnish = (prep?.ingredients ?? []).filter((i) => i.group === "Garnish").map((i) => i.item.toLowerCase());
  const temp = recipe.format === "hot" ? "hot" : recipe.format === "affogato" ? "" : "iced";
  return [
    // "An iced ...", "A hot ..."
    `${temp ? `${/^[aeiou]/i.test(temp) ? "An" : "A"} ${temp} ` : "A "}${recipe.name}.`,
    recipe.flavor_notes,
    garnish.length ? `Topped with ${garnish.join(" and ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The full plan and prompt for one render. Pass a different `seed` for each
 * render so the background staging changes every time.
 */
export function buildPhotoPlan(
  recipe: Recipe,
  seed: number,
  /** Force a specific composition (index into style.compositions), so candidates shown side by side differ */
  opts: {
    composition?: number;
    /** Art-director brief; replaces the keyword-based vessel/moment/props */
    brief?: PhotoBrief;
    /** For briefs with a before/after look: which one this render shows */
    stage?: "before" | "after";
    /** One-off art direction from the editor, for this render only */
    note?: string;
  } = {}
): PhotoPlan {
  const { brief, stage } = opts;
  // The brief (when present) decides the glass; otherwise the drink-type rules do
  const vessel = (brief && brief.vessel in style.vessels ? brief.vessel : chooseVessel(recipe)) as Vessel;
  const ruleMoment = chooseMoment(recipe);
  const moment = brief ? (stage && brief.stages ? `brief: ${stage}` : "brief") : ruleMoment;
  // The brief's story prop leads; ingredient props fill in (max 2, no duplicates)
  const props = [...new Set([...(brief?.story_prop ? [brief.story_prop] : []), ...ingredientProps(recipe)])].slice(
    0,
    MAX_INGREDIENT_PROPS
  );

  // Fresh staging per render: 1-2 random background items (never more than 3
  // props in total) and a varied composition, so no two photos are the same
  // shot with a different drink. Light, angle and set stay fixed.
  const rand = seededRandom(seed);
  const room = Math.max(1, MAX_PROPS - props.length);
  const background = shuffle(style.background_pool, rand).slice(0, Math.min(room, 1 + Math.floor(rand() * 2)));
  const pick = Math.floor(rand() * style.compositions.length);
  const composition = style.compositions[(opts.composition ?? pick) % style.compositions.length];

  // A close-up only has room for one prop; keep the most on-story one (ingredient props come first)
  const isCloseUp = /^close-up/i.test(composition);
  const staging = [...props, ...background].slice(0, isCloseUp ? 1 : MAX_PROPS);
  const shownProps = staging.filter((p) => props.includes(p));
  const shownBackground = staging.filter((p) => background.includes(p));

  const prompt = [
    "Photograph for a home-coffee recipe app.",
    "",
    // The references set the STYLE only. Without this the model copies their
    // layout (same corner, same towel, same framing) and every photo looks alike.
    "STYLE REFERENCE: The attached photos show the house style. Match their light, color grade, surfaces and overall mood, as if shot the same morning in the same kitchen. Do NOT copy their layout, framing, props or the position of the drink: this shot has its own composition and staging, described below.",
    "",
    // Composition first, so it isn't drowned out by everything else
    `COMPOSITION FOR THIS SHOT: ${composition}`,
    "",
    `THE DRINK: ${drinkDescription(recipe)}`,
    `Served in ${style.vessels[vessel]}.`,
    // Show the version people picture, beautifully; its signature must read at thumbnail size
    "Show the classic, expected presentation of this drink (the version people picture when they hear its name), styled beautifully. Its signature must be obvious even at thumbnail size.",
    ...(brief
      ? [
          `THE TELL: ${stage && brief.stages ? brief.stages[stage] : brief.tell}`,
          `COLORS: ${brief.colors}`,
          `HERO DETAIL: ${brief.hero_detail}`,
        ]
      : [ruleMoment ? style.moments[ruleMoment as Moment] : ""]),
    "",
    "STAGING FOR THIS SHOT (these props, and no others; tidy, arranged to fit the composition):",
    ...staging.map((p) => `- ${p}`),
    // The editor's one-off note wins over the automatic choices above, never over the brand rules
    ...(opts.note?.trim()
      ? [
          "",
          `ART DIRECTION FOR THIS RENDER (from the editor; follow it even where it changes the vessel, props or composition above, but never break the NEVER INCLUDE list): ${opts.note.trim().slice(0, 300)}`,
        ]
      : []),
    "",
    "HOUSE STYLE:",
    ...style.house_style.map((l) => `- ${l}`),
    "",
    `NEVER INCLUDE: ${style.never.join("; ")}.`,
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");

  return { vessel, moment, ingredientProps: shownProps, background: shownBackground, composition, prompt };
}
