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
import { matchTaxonomy, type TaxonomyMatchResult } from "./taxonomy-match";

function findTaxonomyMatch(item: string): TaxonomyMatchResult {
  return matchTaxonomy(item, getIngredientTaxonomy());
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

  const isHot = ir.metadata.temperature === "hot";
  const vendorChannel: Channel | null =
    ir.source_type === "nespresso" ? "nespresso" : ir.source_type === "cometeer" ? "cometeer" : null;

  // Superpower 3: Kitchen Mise en Place Steps Generator
  function buildStagedSteps(channel: Channel): string[] {
    const steps: string[] = [];

    if (hasColdFoam) {
      steps.push("## Phase 1: Cold Foam Preparation");
      steps.push(
        "In a small frothing cup, combine the cold foam ingredients and froth with a handheld milk frother for 20–30 seconds until thick and airy. Set aside."
      );
    }

    if (isHot) {
      steps.push(`## Phase ${hasColdFoam ? 2 : 1}: Mug Staging & Warm Milk`);
      steps.push(
        "Warm the milk to about 140°F (60°C) and froth it; stir the syrups into your mug."
      );
    } else {
      steps.push(`## Phase ${hasColdFoam ? 2 : 1}: Glass Staging & Ice Base`);
      steps.push(
        "Fill your serving glass with ice cubes, then pour in milk and syrups; stir gently to combine."
      );
    }

    steps.push(`## Phase ${hasColdFoam ? 3 : 2}: Coffee Extraction & Pour`);
    if (isHot) {
      if (channel === "cometeer") {
        steps.push(
          "Pour 2–4 oz of just-off-boil water into the mug and empty the frozen Cometeer capsule into it; stir until fully melted."
        );
      } else if (channel === "nespresso") {
        steps.push("Brew the Nespresso pod directly into the mug over the syrups.");
      } else {
        steps.push(
          "Dissolve 1.5–2 tsp instant espresso crystals in 2 oz (60ml) hot water directly in the mug."
        );
      }
      steps.push("Pour the frothed milk over the coffee, holding back the foam, then spoon the foam on top.");
    } else if (channel === "cometeer") {
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
        steps.push(`Spoon the prepared cold foam from Phase 1 over the top of the ${isHot ? "latte" : "iced latte"}.`);
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

  // Vendor imports: the vendor's own channel is the original, as published —
  // their exact capsule, count, and volume, and their method (rewritten in
  // our words by the vendor extractor). The other two channels stay adapted.
  if (vendorChannel) {
    const stated = ir.stated_coffee;
    const count = stated.capsule_count || 1;
    const vendorSteps = ir.raw_steps.length > 0 ? ir.raw_steps : undefined;

    if (vendorChannel === "nespresso") {
      const system = stated.system === "original" ? "original" : "vertuo";
      const ml = stated.serving_size_ml;
      nespressoPrep.nespresso_system = system;
      nespressoPrep.tested_with = stated.raw_name;
      nespressoPrep.capsule_count = count;
      nespressoPrep.provenance = "original";
      nespressoPrep.ingredients = nespressoPrep.ingredients.map((ing) =>
        ing.group === "Latte Base" && (ing.item_id === "nespresso_pod" || ing.item_id === "nespresso_double_pod")
          ? {
              amount: count,
              unit: "pod",
              secondary_amount: ml,
              secondary_unit: ml ? "ml" : undefined,
              item: `Nespresso ${system === "original" ? "Original" : "Vertuo"} ${stated.raw_name}${/pod|capsule/i.test(stated.raw_name) ? "" : " pod"}`,
              item_id: ml && ml <= 45 ? "nespresso_pod" : "nespresso_double_pod",
              group: "Latte Base",
            }
          : ing
      );
      if (vendorSteps) nespressoPrep.steps = vendorSteps;
    } else {
      cometeerPrep.tested_with = stated.raw_name;
      cometeerPrep.capsule_count = count;
      cometeerPrep.provenance = "original";
      cometeerPrep.ingredients = cometeerPrep.ingredients.map((ing) =>
        ing.item_id === "cometeer_capsule"
          ? {
              ...ing,
              amount: count,
              secondary_amount: 26 * count,
              item: `Cometeer ${stated.raw_name}${/capsule/i.test(stated.raw_name) ? "" : " capsule"}`,
            }
          : ing
      );
      if (vendorSteps) cometeerPrep.steps = vendorSteps;
    }
  }

  // Recipe Candidate
  const rawCleanSlug = slugify(ir.generated_slug || `${ir.source_creator?.handle || "creator"}-${ir.raw_title}`);
  // Ensure slug matches pattern lowercase letters, numbers, single dashes
  const cleanSlug = rawCleanSlug.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const candidate: Recipe = {
    slug: cleanSlug,
    name: ir.raw_title.replace(/\s+/g, " ").trim(),
    format: isHot ? "hot" : "iced",
    flavor_notes: `Rich espresso layered with smooth ${hasColdFoam ? "velvety cold foam" : isHot ? "steamed milk" : "cold milk"} and balanced sweetness.`,
    barista_note: hasColdFoam
      ? "Whip the cold foam first so it forms a stable, airy head before pouring espresso over ice."
      : isHot
      ? "Warm the mug first so the milk and coffee stay hot to the last sip."
      : "Pour espresso directly over ice to preserve the temperature boundary and prevent watery dilution.",
    status: "needs_testing",
    tags: [
      ir.metadata.temperature,
      hasColdFoam ? "cold-foam" : "latte",
      vendorChannel ? `${vendorChannel}-original` : ir.source_type === "web" ? "web-find" : "viral-trend",
      "quick-fix",
    ],
    sweetness_level: ir.metadata.sweetness_hint || "rich_sweet",
    source: {
      type: vendorChannel ? "vendor" : "creator",
      name: ir.source_creator?.name || "Coffee Creator",
      handle: ir.source_creator?.handle || undefined,
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
