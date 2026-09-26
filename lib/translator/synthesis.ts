import type {
  Channel,
  Preparation,
  Recipe,
  RoastRecommendation,
  SweetnessLevel,
} from "@/lib/types";
import { getIngredientTaxonomy, ingredientTaxonomyIds } from "@/lib/taxonomy";
import { calculateNutrition } from "@/lib/nutrition";
import { validateRecipeCandidate } from "@/lib/recipe-schema";
import type {
  RecipeIR,
  TaxonomyMatch,
  TranslationResult,
  TranslationSuperpowers,
} from "./types";
import { slugify } from "@/lib/slugify";

function findTaxonomyMatch(
  item: string
): { id?: string; name?: string; is_novel: boolean } {
  const taxonomy = getIngredientTaxonomy();
  const lower = item.trim().toLowerCase();

  // 1. Exact ID match
  const byId = taxonomy.find((e) => e.id.toLowerCase() === lower);
  if (byId) return { id: byId.id, name: byId.name, is_novel: false };

  // 2. Exact Name match
  const byName = taxonomy.find((e) => e.name.toLowerCase() === lower);
  if (byName) return { id: byName.id, name: byName.name, is_novel: false };

  // 3. Exact Alias match
  const byAlias = taxonomy.find((e) =>
    e.aliases.some((a) => a.toLowerCase() === lower)
  );
  if (byAlias) return { id: byAlias.id, name: byAlias.name, is_novel: false };

  // 4. Heuristic / partial match
  for (const entry of taxonomy) {
    if (lower.includes(entry.name.toLowerCase())) {
      return { id: entry.id, name: entry.name, is_novel: false };
    }
    for (const alias of entry.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return { id: entry.id, name: entry.name, is_novel: false };
      }
    }
  }

  // Keywords heuristics
  if (lower.includes("cream") && !lower.includes("ice cream")) {
    const heavyCream = taxonomy.find((e) => e.id === "heavy_cream");
    if (heavyCream) return { id: heavyCream.id, name: heavyCream.name, is_novel: false };
  }
  if (lower.includes("cookie butter") || lower.includes("biscoff spread") || lower.includes("speculoos")) {
    const cb = taxonomy.find((e) => e.id === "cookie_butter");
    if (cb) return { id: cb.id, name: cb.name, is_novel: false };
  }
  if (lower.includes("oat milk")) {
    const oat = taxonomy.find((e) => e.id === "oat_milk");
    if (oat) return { id: oat.id, name: oat.name, is_novel: false };
  }
  if (lower.includes("milk") && !lower.includes("condensed") && !lower.includes("oat")) {
    const milk = taxonomy.find((e) => e.id === "milk");
    if (milk) return { id: milk.id, name: milk.name, is_novel: false };
  }
  if (lower.includes("vanilla syrup")) {
    const vs = taxonomy.find((e) => e.id === "vanilla_syrup");
    if (vs) return { id: vs.id, name: vs.name, is_novel: false };
  }
  if (lower.includes("caramel syrup") || lower.includes("salted caramel syrup")) {
    const sc = taxonomy.find((e) => e.id === "salted_caramel_syrup");
    if (sc) return { id: sc.id, name: sc.name, is_novel: false };
  }
  if (lower.includes("caramel sauce") || lower.includes("caramel drizzle")) {
    const cs = taxonomy.find((e) => e.id === "caramel_sauce");
    if (cs) return { id: cs.id, name: cs.name, is_novel: false };
  }
  if (lower.includes("cinnamon")) {
    const cin = taxonomy.find((e) => e.id === "ground_cinnamon");
    if (cin) return { id: cin.id, name: cin.name, is_novel: false };
  }
  if (lower.includes("protein shake") || lower.includes("fairlife")) {
    const ps = taxonomy.find((e) => e.id === "vanilla_protein_shake");
    if (ps) return { id: ps.id, name: ps.name, is_novel: false };
  }
  if (lower.includes("salt")) {
    const fs = taxonomy.find((e) => e.id === "flaky_salt") || taxonomy.find((e) => e.id === "pinch_of_salt");
    if (fs) return { id: fs.id, name: fs.name, is_novel: false };
  }
  if (lower.includes("ice")) {
    const ice = taxonomy.find((e) => e.id === "ice");
    if (ice) return { id: ice.id, name: ice.name, is_novel: false };
  }

  // Novel ingredient fallback
  return { is_novel: true };
}

function getRoastNote(roast: RoastRecommendation): string {
  switch (roast) {
    case "dark":
      return "Bold, roasty profile with low acidity to punch through sweet syrups and cream.";
    case "light":
      return "Delicate, floral profile with crisp acidity to complement sparkling or milk bases.";
    case "medium":
    default:
      return "Balanced profile with caramel and toasted nut notes suited for flavored milks and syrups.";
  }
}

export function synthesizeRecipe(ir: RecipeIR): TranslationResult {
  const taxonomyMatches: TaxonomyMatch[] = [];
  const warnings: string[] = [];

  // Determine Roast Recommendation from IR
  let roast: RoastRecommendation = "medium";
  if (ir.stated_coffee.roast_profile) {
    roast = ir.stated_coffee.roast_profile;
  } else if (ir.stated_coffee.intensity && ir.stated_coffee.intensity >= 9) {
    roast = "dark";
  } else if (ir.stated_coffee.intensity && ir.stated_coffee.intensity <= 4) {
    roast = "light";
  }

  const roastNote = getRoastNote(roast);

  // Match ingredients & isolate coffee items
  const nonCoffeeIngredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
    item_id?: string;
    group?: string;
    optional?: boolean;
    notes?: string;
  }> = [];

  for (const raw of ir.raw_ingredients) {
    const itemLower = raw.item.toLowerCase();
    const isCoffeeItem =
      itemLower.includes("espresso") ||
      itemLower.includes("pod") ||
      itemLower.includes("cometeer") ||
      itemLower.includes("nespresso") ||
      itemLower.includes("instant coffee");

    if (isCoffeeItem) continue;

    const match = findTaxonomyMatch(raw.item);
    taxonomyMatches.push({
      raw_item: raw.item,
      matched_id: match.id,
      matched_name: match.name,
      is_novel: match.is_novel,
    });

    if (match.is_novel) {
      warnings.push(`Novel ingredient detected: "${raw.item}". Taxonomy ID omitted.`);
    }

    nonCoffeeIngredients.push({
      amount: raw.amount,
      unit: raw.unit,
      item: raw.item,
      item_id: match.id,
      group: raw.group || "Latte Base",
      optional: raw.optional,
      notes: raw.notes,
    });
  }

  // Detect Cold Foam Presence
  const hasColdFoam = nonCoffeeIngredients.some(
    (ing) => ing.group?.toLowerCase().includes("foam") || /heavy cream/i.test(ing.item)
  );

  // Superpower 3: Kitchen Mise en Place Steps Generator
  function buildStagedSteps(channel: Channel): string[] {
    const steps: string[] = [];

    if (hasColdFoam) {
      steps.push("## Phase 1: Cold Foam Preparation");
      steps.push(
        "In a small frothing cup, combine the cold foam ingredients and froth with a handheld milk frother for 20–30 seconds until thick and airy. Set aside."
      );
    }

    steps.push(`## Phase ${hasColdFoam ? 2 : 1}: Glass Staging & Ice Base`);
    steps.push(
      "Fill your serving glass with ice cubes, then pour in milk and syrups; stir gently to combine."
    );

    steps.push(`## Phase ${hasColdFoam ? 3 : 2}: Coffee Extraction & Pour`);
    if (channel === "cometeer") {
      steps.push(
        "Melt the Cometeer capsule completely and chill before pouring (or run under warm water for 2 minutes to liquefy). Pour the chilled coffee extract directly over the iced milk."
      );
    } else if (channel === "nespresso") {
      steps.push(
        "Brew the Nespresso Vertuo pod directly into a small cup or over ice to chill quickly, then pour gently over the iced milk."
      );
    } else {
      steps.push(
        "Dissolve 1.5–2 tsp instant espresso crystals in 2 oz (60ml) hot water to fully bloom the coffee. Chill the concentrate, then pour directly over the iced milk."
      );
    }

    if (hasColdFoam || nonCoffeeIngredients.some((i) => i.group === "Garnish")) {
      steps.push(`## Phase ${hasColdFoam ? 4 : 3}: Crown & Garnish`);
      if (hasColdFoam) {
        steps.push("Spoon the prepared cold foam from Phase 1 over the top of the iced latte.");
      }
      const garnish = nonCoffeeIngredients.find((i) => i.group === "Garnish");
      if (garnish) {
        steps.push(`Finish with a dusting of ${garnish.item}.`);
      }
    }

    return steps;
  }

  // Channel 1: Cometeer Preparation
  const cometeerIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam")),
    {
      amount: 1,
      unit: "capsule",
      secondary_amount: 26,
      secondary_unit: "g extract",
      item: "Cometeer capsule, melted and chilled",
      item_id: "cometeer_capsule",
      group: "Latte Base",
    },
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish"
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish"),
  ];

  const cometeerTestedWith =
    roast === "dark"
      ? "Counter Culture Forty-Six or Equator Mocha Java"
      : roast === "light"
      ? "George Howell Alchemy or Equator Kenya"
      : "Counter Culture Big Trouble or Joe Coffee The Daily";

  const cometeerPrep: Preparation = {
    channel: "cometeer",
    roast_recommendation: roast,
    roast_note: roastNote,
    tested_with: cometeerTestedWith,
    capsule_count: 1,
    caffeine_level: "full",
    servings: 1,
    yield_unit: "drink",
    prep_time_minutes: ir.metadata.prep_time_minutes || 4,
    difficulty: "easy",
    equipment: hasColdFoam ? ["handheld milk frother"] : undefined,
    ingredients: cometeerIngredients,
    steps: buildStagedSteps("cometeer"),
    provenance: "adapted",
  };

  // Channel 2: Nespresso Vertuo Preparation
  const isDoubleShot = (ir.stated_coffee.shots || 2) >= 2;
  const nespressoIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam")),
    {
      amount: 1,
      unit: "pod",
      secondary_amount: isDoubleShot ? 80 : 40,
      secondary_unit: "ml",
      item: isDoubleShot
        ? "Nespresso Vertuo Double Espresso pod"
        : "Nespresso Vertuo pod, brewed as a single shot",
      item_id: isDoubleShot ? "nespresso_double_pod" : "nespresso_pod",
      group: "Latte Base",
    },
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish"
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish"),
  ];

  const nespressoTestedWith = isDoubleShot
    ? roast === "dark"
      ? "Nespresso Double Espresso Scuro (Vertuo 80ml)"
      : "Nespresso Double Espresso Chiaro (Vertuo 80ml)"
    : roast === "dark"
    ? "Nespresso Il Caffè or Altissio (Vertuo 40ml)"
    : roast === "light"
    ? "Nespresso Voltesso (Vertuo 40ml)"
    : "Nespresso Orafio (Vertuo 40ml)";

  const nespressoPrep: Preparation = {
    channel: "nespresso",
    nespresso_system: "vertuo",
    roast_recommendation: roast,
    roast_note: roastNote,
    tested_with: nespressoTestedWith,
    capsule_count: 1,
    caffeine_level: "full",
    servings: 1,
    yield_unit: "drink",
    prep_time_minutes: ir.metadata.prep_time_minutes || 4,
    difficulty: "easy",
    equipment: hasColdFoam ? ["handheld milk frother"] : undefined,
    ingredients: nespressoIngredients,
    steps: buildStagedSteps("nespresso"),
    provenance: ir.source_type.includes("tiktok") || ir.source_type.includes("instagram") ? "original" : "adapted",
  };

  // Channel 3: Instant Preparation
  const instantIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam")),
    {
      amount: 2,
      unit: "tsp",
      secondary_amount: 60,
      secondary_unit: "ml hot bloom water",
      item: "Instant espresso crystals (e.g. Medaglia d'Oro)",
      item_id: "instant_coffee",
      group: "Latte Base",
    },
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish"
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish"),
  ];

  const instantTestedWith =
    roast === "dark"
      ? "Medaglia d'Oro or Café Bustelo Instant Espresso"
      : "Nescafé Gold Espresso or Mount Hagen Organic";

  const instantPrep: Preparation = {
    channel: "instant",
    roast_recommendation: roast,
    roast_note: roastNote,
    tested_with: instantTestedWith,
    caffeine_level: "full",
    servings: 1,
    yield_unit: "drink",
    prep_time_minutes: ir.metadata.prep_time_minutes || 4,
    difficulty: "easy",
    equipment: hasColdFoam ? ["handheld milk frother"] : undefined,
    ingredients: instantIngredients,
    steps: buildStagedSteps("instant"),
    provenance: "adapted",
  };

  // Recipe Candidate
  const rawCleanSlug = slugify(ir.generated_slug || `${ir.source_creator?.handle || "creator"}-${ir.raw_title}`);
  // Ensure slug matches pattern lowercase letters, numbers, single dashes
  const cleanSlug = rawCleanSlug.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const candidate: Recipe = {
    slug: cleanSlug,
    name: ir.raw_title.replace(/\s+/g, " ").trim(),
    format: ir.metadata.temperature === "hot" ? "hot" : "iced",
    flavor_notes: `Rich espresso layered with smooth ${hasColdFoam ? "velvety cold foam" : "cold milk"} and balanced sweetness.`,
    barista_note: hasColdFoam
      ? "Whip the cold foam first so it forms a stable, airy head before pouring espresso over ice."
      : "Pour espresso directly over ice to preserve the temperature boundary and prevent watery dilution.",
    status: "needs_testing",
    tags: [
      ir.metadata.temperature,
      hasColdFoam ? "cold-foam" : "latte",
      "viral-trend",
      "quick-fix",
    ],
    sweetness_level: ir.metadata.sweetness_hint || "rich_sweet",
    source: {
      type: "creator",
      name: ir.source_creator?.name || "Coffee Creator",
      handle: ir.source_creator?.handle,
      platform: ir.source_creator?.platform,
      url: ir.source_url,
      avatar: ir.source_creator?.avatar,
    },
    preparations: [cometeerPrep, nespressoPrep, instantPrep],
  };

  // Validate candidate using canonical validator
  const validationErrors = validateRecipeCandidate(candidate, ingredientTaxonomyIds());

  // Calculate Nutrition for all 3 channels
  const cometeerMacros = calculateNutrition(cometeerPrep);
  const nespressoMacros = calculateNutrition(nespressoPrep);
  const instantMacros = calculateNutrition(instantPrep);

  const primaryMacros = nespressoMacros;
  const humanCaffeine = `~${(primaryMacros.caffeine_mg / 95).toFixed(1)} cups of coffee`;
  const humanSugar = `~${primaryMacros.sugar_g}g (${Math.round(primaryMacros.sugar_g / 4)} tsp sugar)`;

  // Superpowers Metadata
  const superpowers: TranslationSuperpowers = {
    hardware_brew_math: {
      cometeer: {
        summary: "1 capsule (26g frozen extract) melted into liquid concentrate before pouring.",
        ratio: "1 capsule : 4-6 oz milk",
        recommendation: cometeerTestedWith,
      },
      nespresso: {
        summary: `${isDoubleShot ? "Double Espresso (80ml)" : "Single Espresso (40ml)"} pod pulled directly over ice.`,
        ratio: isDoubleShot ? "80ml shot : 4 oz milk" : "40ml shot : 3 oz milk",
        pod_pick: nespressoTestedWith,
        system: "vertuo",
      },
      instant: {
        summary: "2 tsp instant espresso bloomed in 2 oz (60ml) hot water before ice.",
        ratio: "2 tsp crystals : 2 oz hot bloom : 4 oz milk",
        bloom_note: instantTestedWith,
      },
    },
    nutritional_reality: {
      calories: primaryMacros.calories,
      sugar_g: primaryMacros.sugar_g,
      fat_g: primaryMacros.fat_g,
      protein_g: primaryMacros.protein_g,
      caffeine_mg: primaryMacros.caffeine_mg,
      human_caffeine_ref: humanCaffeine,
      human_sugar_ref: humanSugar,
    },
    mise_en_place: {
      phases: [
        ...(hasColdFoam
          ? [
              {
                phaseNumber: 1,
                name: "Cold Foam Staging",
                steps: [
                  "Froth cream and milk with a handheld frother until thick and velvety.",
                  "Set aside before any ice or espresso is touched.",
                ],
              },
            ]
          : []),
        {
          phaseNumber: hasColdFoam ? 2 : 1,
          name: "Iced Milk Base",
          steps: [
            "Fill glass with ice cubes.",
            "Pour cold milk and syrups; stir gently.",
          ],
        },
        {
          phaseNumber: hasColdFoam ? 3 : 2,
          name: "Coffee Pour",
          steps: [
            "Pour melted or freshly pulled espresso directly over iced milk.",
          ],
        },
        {
          phaseNumber: hasColdFoam ? 4 : 3,
          name: "Crown & Garnish",
          steps: [
            hasColdFoam
              ? "Spoon cold foam over top and garnish."
              : "Stir once and garnish.",
          ],
        },
      ],
    },
  };

  return {
    ir,
    recipe: candidate,
    nutritional_breakdowns: {
      cometeer: cometeerMacros,
      nespresso: nespressoMacros,
      instant: instantMacros,
    },
    superpowers,
    taxonomy_matches: taxonomyMatches,
    validation_errors: validationErrors,
    warnings,
    extraction_mode: ir.extraction_mode,
    text_overlays: ir.text_overlays,
  };
}
