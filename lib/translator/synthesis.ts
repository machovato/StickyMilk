import type {
  Channel,
  Preparation,
  Recipe,
  RoastRecommendation,
  SweetnessLevel,
} from "@/lib/types";
import { getIngredientTaxonomy, ingredientTaxonomyIds } from "@/lib/taxonomy";
import { calculateNutrition, convertAmount, normalizeUnit } from "@/lib/nutrition";
import { validateRecipeCandidate } from "@/lib/recipe-schema";
import type {
  RecipeIR,
  TaxonomyMatch,
  TranslationResult,
  TranslationSuperpowers,
} from "./types";
import { slugify } from "@/lib/slugify";
import { matchTaxonomy, type TaxonomyMatchResult } from "./taxonomy-match";
import { cometeerFor, doseFromStated, instantFor, nespressoFor } from "./brew-math";

function findTaxonomyMatch(item: string): TaxonomyMatchResult {
  return matchTaxonomy(item, getIngredientTaxonomy());
}

/** Drink-type tag from the extractor's drink_style, else the title; "coffee" if unknown. */
const DRINK_TYPES = [
  "shaken espresso", "flat white", "cold brew", "coffee tonic", "cappuccino", "macchiato", "americano",
  "affogato", "cortado", "frappe", "mocha", "latte", "espresso",
];
function drinkTypeTag(ir: RecipeIR): string {
  const text = `${ir.metadata.drink_style ?? ""} ${ir.raw_title}`.toLowerCase();
  const found = DRINK_TYPES.find((t) => text.includes(t));
  return found ? found.replace(/\s+/g, "-") : "coffee";
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
      itemLower.includes("instant") ||
      /\bcoffee\b/.test(itemLower);

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

    // Only assign item_id if unit converts cleanly to the taxonomy entry's per.unit
    let assignedItemId: string | undefined = undefined;
    if (match.id) {
      const taxonomy = getIngredientTaxonomy();
      const entry = taxonomy.find((e) => e.id === match.id);
      if (!entry?.nutrition || convertAmount(raw.amount ?? 1, raw.unit, entry.nutrition.per.unit) !== null) {
        assignedItemId = match.id;
      }
    }

    nonCoffeeIngredients.push({
      amount: raw.amount,
      // Store clean units ("TSPS." -> "tsp", "TBS." -> "tbsp") so pages read well and nutrition can convert them
      unit: normalizeUnit(raw.unit),
      item: raw.item,
      item_id: assignedItemId,
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

  // Helper to detect plain bloom water (used to bloom/dissolve instant coffee)
  const isBloomWater = (name: string) => {
    const l = name.toLowerCase();
    return (
      (l.includes("water") || l.includes("hot water") || l.includes("bloom water") || l.includes("boiling water")) &&
      !l.includes("tonic") &&
      !l.includes("sparkling") &&
      !l.includes("soda") &&
      !l.includes("rose")
    );
  };

  // Extract bloom water amount in ml if specified in raw ingredients
  const rawBloomWater = nonCoffeeIngredients.find((i) => isBloomWater(i.item));
  const bloomWaterMl = rawBloomWater?.amount
    ? Math.round(convertAmount(rawBloomWater.amount, rawBloomWater.unit, "ml") ?? 60)
    : 60;

  // Barista Heuristic: Separate Flavor Base (syrups, sauces, honey, sugars, spices, condensed milk) from Milk & Ice
  const isCondensedMilk = (name: string) => /\b(condensed|dulce de leche)\b/i.test(name);

  const baseFlavorItems = nonCoffeeIngredients.filter((i) => {
    const grp = (i.group || "").toLowerCase();
    if (grp.includes("foam") || grp === "garnish") return false;
    const name = i.item.toLowerCase();
    if (name.includes("ice") || isBloomWater(name)) return false;
    if (isCondensedMilk(name)) return true; // Condensed milk is a sweet flavor base that dissolves in hot espresso
    if (/\b(milk|oat milk|almond milk|soy milk|dairy|half and half|cream|creamer|protein shake)\b/i.test(name)) return false;
    return true;
  });

  const baseMilkItems = nonCoffeeIngredients.filter((i) => {
    const grp = (i.group || "").toLowerCase();
    if (grp.includes("foam") || grp === "garnish") return false;
    const name = i.item.toLowerCase();
    if (isCondensedMilk(name) || isBloomWater(name) || name.includes("ice")) return false;
    return /\b(milk|oat milk|almond milk|soy milk|dairy|half and half|cream|creamer|protein shake)\b/i.test(name);
  });

  const hasFlavorBase = baseFlavorItems.length > 0;

  // ---- Brew math: how much coffee each machine needs (see brew-math.ts) ----
  // 1. Turn whatever the source used (pods, capsules, shots, tsp, cups) into
  //    one common dose, measured in "doubles".
  const dose = doseFromStated(ir.stated_coffee);
  // 2. A milk drink never gets extra water to match volume; the milk does that.
  const hasMilk = baseMilkItems.length > 0 || hasColdFoam;
  // 3. Express that same dose on each machine (whole pods/capsules, 1/2 tsp instant).
  const nespressoPlan = nespressoFor(dose);
  const cometeerPlan = cometeerFor(dose, { hot: isHot, hasMilk });
  const instantPlan = instantFor(dose, {
    // Keep the recipe's own dissolving water for instant if it states one
    bloomMlOverride: rawBloomWater?.amount ? bloomWaterMl : undefined,
  });
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // Step text for the coffee on each machine, shared by the hot and iced templates.
  // Cometeer: melt it (about 5 minutes submerged in hot water, or overnight in
  // the fridge) for anything with milk; frozen only for plain hot coffee.
  const COMETEER_MELT = `Melt ${cometeerPlan.capsules === 1 ? "the Cometeer capsule" : `${cometeerPlan.capsules} Cometeer capsules`} (about 5 minutes submerged in hot water, or overnight in the fridge)`;
  const nespressoBrew = `Brew ${nespressoPlan.summary.replace(/ \(\d+ ml\)/g, "")}`;
  const instantDissolve = `Dissolve ${instantPlan.tsp} tsp instant espresso in ${Math.round(instantPlan.water_ml / 30)} oz (${instantPlan.water_ml} ml) hot water`;

  function formatFlavorItems(items: typeof baseFlavorItems): string {
    if (items.length === 0) return "syrups and seasonings";
    const phrases = items.map((i) => {
      const amtStr = i.amount !== undefined ? `${i.amount} ` : "";
      const unitStr = i.unit ? `${i.unit} ` : "";
      return `${amtStr}${unitStr}${i.item}`.trim();
    });
    if (phrases.length === 1) return phrases[0];
    if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
    return `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
  }

  // Superpower 3: Kitchen Mise en Place Steps Generator
  function buildStagedSteps(channel: Channel): string[] {
    const steps: string[] = [];
    let phaseNum = 1;

    // Phase: Cold Foam (if present)
    if (hasColdFoam) {
      steps.push(`## Phase ${phaseNum++}: Cold Foam Preparation`);
      steps.push(
        "In a small frothing cup, combine the cold foam ingredients and froth with a handheld milk frother for 20–30 seconds until thick and airy. Set aside."
      );
    }

    if (isHot) {
      if (hasFlavorBase) {
        steps.push(`## Phase ${phaseNum++}: Flavor Base & Hot Extraction`);
        steps.push(`In your serving mug, combine ${formatFlavorItems(baseFlavorItems)}.`);
        if (channel === "cometeer") {
          // Cometeer's own hot latte: melted concentrate + steamed milk, no added water
          steps.push(`${COMETEER_MELT}. Pour it into the mug over the syrups and spices; stir until fully dissolved.`);
        } else if (channel === "nespresso") {
          steps.push(`${nespressoBrew} directly into the mug over the syrups and spices; stir until fully dissolved.`);
        } else {
          steps.push(`${instantDissolve} directly in the mug over the syrups and spices; stir until completely dissolved.`);
        }
        steps.push(`## Phase ${phaseNum++}: Steamed Milk & Pour`);
        steps.push("Warm and froth milk to about 140°F (60°C). Pour the frothed milk over the coffee, holding back the foam, then spoon the velvety foam on top.");
      } else {
        steps.push(`## Phase ${phaseNum++}: Mug Staging & Warm Milk`);
        steps.push("Warm the milk to about 140°F (60°C) and froth it.");
        steps.push(`## Phase ${phaseNum++}: Coffee Extraction & Pour`);
        if (channel === "cometeer") {
          if (cometeerPlan.state === "frozen") {
            // Plain hot coffee is the one case Cometeer uses the frozen puck
            steps.push(
              `Pop ${cometeerPlan.capsules === 1 ? "the frozen Cometeer puck" : `${cometeerPlan.capsules} frozen Cometeer pucks`} into the mug with ${cometeerPlan.water_oz} oz hot water; stir until dissolved.`
            );
          } else {
            steps.push(`${COMETEER_MELT}. Pour it into the mug${cometeerPlan.water_oz ? ` with ${cometeerPlan.water_oz} oz hot water` : ""}.`);
          }
        } else if (channel === "nespresso") {
          steps.push(`${nespressoBrew} directly into the mug.`);
        } else {
          steps.push(`${instantDissolve} directly in the mug.`);
        }
        steps.push("Pour the frothed milk over the coffee, holding back the foam, then spoon the foam on top.");
      }
    } else {
      // Iced drink: Barista heuristic: Syrups & spices must dissolve in coffee BEFORE ice is added
      if (hasFlavorBase) {
        steps.push(`## Phase ${phaseNum++}: Flavor Base & Extraction`);
        steps.push(`In your serving glass, combine ${formatFlavorItems(baseFlavorItems)}.`);
        if (channel === "cometeer") {
          steps.push(
            `${COMETEER_MELT}. Pour it directly over the syrups and spices; stir or whisk with a handheld frother until completely dissolved.`
          );
        } else if (channel === "nespresso") {
          steps.push(
            `${nespressoBrew} directly into the glass over the syrups and spices. Stir or whisk with a handheld frother for 10 seconds until completely dissolved.`
          );
        } else {
          steps.push(`${instantDissolve} directly over the syrups and spices; stir until completely dissolved.`);
        }

        steps.push(`## Phase ${phaseNum++}: Ice & Milk Pour`);
        steps.push("Fill the glass with plenty of ice cubes.");
        const milkDesc =
          baseMilkItems.length > 0
            ? baseMilkItems
                .map((i) => [i.amount, i.unit, i.item].filter(Boolean).join(" "))
                .join(" and ")
            : "cold milk";
        steps.push(`Pour ${milkDesc} over the ice; stir gently to combine and watch the layers swirl.`);
      } else {
        steps.push(`## Phase ${phaseNum++}: Glass Staging & Ice Base`);
        steps.push("Fill your serving glass with ice cubes, then pour in cold milk.");
        steps.push(`## Phase ${phaseNum++}: Coffee Extraction & Pour`);
        if (channel === "cometeer") {
          // No chilling step needed: the ice does that
          steps.push(
            `${COMETEER_MELT}. Pour the melted coffee${cometeerPlan.water_oz ? ` and ${cometeerPlan.water_oz} oz cold water` : ""} directly over the iced milk.`
          );
        } else if (channel === "nespresso") {
          steps.push(`${nespressoBrew} into a small cup or directly over ice to chill quickly, then pour gently over the iced milk.`);
        } else {
          steps.push(`${instantDissolve} to fully bloom the coffee, then pour directly over the iced milk.`);
        }
      }
    }

    if (hasColdFoam || nonCoffeeIngredients.some((i) => i.group === "Garnish")) {
      steps.push(`## Phase ${phaseNum++}: Crown & Garnish`);
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

  // Determine original channel from creator source, stated coffee, and recipe signals
  const isSocialReel =
    ir.source_type.includes("tiktok") ||
    ir.source_type.includes("instagram") ||
    ir.source_type.includes("youtube");

  const textEvidence = [
    ir.raw_title,
    ir.stated_coffee?.raw_name,
    ir.stated_coffee?.system,
    ...(ir.raw_ingredients || []).map((i) => `${i.item} ${i.notes || ""}`),
    ...(ir.raw_steps || []),
    ir.source_url,
  ].join(" ").toLowerCase();

  let originalChannel: Channel | null = null;
  if (vendorChannel) {
    originalChannel = vendorChannel;
  } else if (
    ir.stated_coffee?.system === "instant" ||
    /\b(instant|crystals|granules|nescaf[eé]|dissolve.*water|instant coffee|instant espresso)\b/i.test(textEvidence)
  ) {
    originalChannel = "instant";
  } else if (
    ir.stated_coffee?.system === "capsule" ||
    /\b(cometeer|frozen capsule)\b/i.test(textEvidence)
  ) {
    originalChannel = "cometeer";
  } else if (
    /\b(nespresso|vertuo|chiaro|scuro|voltesso|diavolitto|altissio|orafio)\b/i.test(textEvidence)
  ) {
    originalChannel = "nespresso";
  } else if (isSocialReel) {
    originalChannel = "nespresso";
  }

  // Channel 1: Cometeer Preparation
  const cometeerIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam") && !isBloomWater(i.item)),
    {
      amount: cometeerPlan.capsules,
      unit: "capsule",
      secondary_amount: 26 * cometeerPlan.capsules,
      secondary_unit: "g extract",
      item: `Cometeer capsule, ${cometeerPlan.state}`,
      item_id: "cometeer_capsule",
      group: "Latte Base",
      // Caffeine is reported, never used to shrink the dose; point to the
      // lower-caffeine capsules instead (same flavor).
      notes: [
        cometeerPlan.strength_note,
        "For less caffeine, use Half Caff (~90 mg) or Decaf capsules; same flavor.",
      ]
        .filter(Boolean)
        .join(" "),
    },
    // Brewed-coffee sources only: water to match the original coffee's volume
    ...(cometeerPlan.water_oz
      ? [{ amount: cometeerPlan.water_oz, unit: "oz", item: isHot ? "hot water" : "cold water", item_id: isHot ? "hot_water" : "water", group: "Latte Base" }]
      : []),
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish" && !isBloomWater(i.item)
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish" && !isBloomWater(i.item)),
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
    capsule_count: cometeerPlan.capsules,
    caffeine_level: "full",
    servings: 1,
    yield_unit: "drink",
    prep_time_minutes: ir.metadata.prep_time_minutes || 4,
    difficulty: "easy",
    equipment: hasColdFoam ? ["handheld milk frother"] : undefined,
    ingredients: cometeerIngredients,
    steps: buildStagedSteps("cometeer"),
    provenance: originalChannel === "cometeer" ? "original" : "adapted",
  };

  // Channel 2: Nespresso Vertuo Preparation
  // The main pod decides the pod recommendation (Double Espresso, Espresso or Mug)
  const mainPod = nespressoPlan.pods[0];
  const isDoubleShot = mainPod.kind !== "espresso";
  const POD_NAMES = { double: "Double Espresso", espresso: "Espresso", mug: "Mug" } as const;
  const nespressoIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam") && !isBloomWater(i.item)),
    ...nespressoPlan.pods.map((pod) => ({
      amount: pod.count,
      unit: "pod",
      secondary_amount: pod.ml * pod.count,
      secondary_unit: "ml",
      item: `Nespresso Vertuo ${POD_NAMES[pod.kind]} pod`,
      item_id: pod.item_id,
      group: "Latte Base",
    })),
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish" && !isBloomWater(i.item)
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish" && !isBloomWater(i.item)),
  ];

  const nespressoTestedWith = mainPod.kind === "mug"
    ? roast === "dark"
      ? "Nespresso Stormio or Intenso (Vertuo Mug 230ml)"
      : "Nespresso Melozio (Vertuo Mug 230ml)"
    : isDoubleShot
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
    capsule_count: nespressoPlan.capsule_count,
    caffeine_level: "full",
    servings: 1,
    yield_unit: "drink",
    prep_time_minutes: ir.metadata.prep_time_minutes || 4,
    difficulty: "easy",
    equipment: hasColdFoam ? ["handheld milk frother"] : undefined,
    ingredients: nespressoIngredients,
    steps: buildStagedSteps("nespresso"),
    provenance: originalChannel === "nespresso" ? "original" : "adapted",
  };

  // Channel 3: Instant Preparation
  const instantIngredients = [
    ...nonCoffeeIngredients.filter((i) => i.group?.toLowerCase().includes("foam") && !isBloomWater(i.item)),
    {
      amount: instantPlan.tsp,
      unit: "tsp",
      secondary_amount: instantPlan.water_ml,
      secondary_unit: dose.style === "brewed" ? "ml hot water" : "ml hot bloom water",
      item: "Instant espresso crystals (e.g. Medaglia d'Oro)",
      item_id: "instant_coffee",
      group: "Latte Base",
    },
    ...nonCoffeeIngredients.filter(
      (i) => !i.group?.toLowerCase().includes("foam") && i.group !== "Garnish" && !isBloomWater(i.item)
    ),
    ...nonCoffeeIngredients.filter((i) => i.group === "Garnish" && !isBloomWater(i.item)),
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
    provenance: originalChannel === "instant" ? "original" : "adapted",
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
      // The generic plan may have several pod lines (e.g. Double + Espresso);
      // swap them all for the single pod line the vendor actually published.
      const isPodLine = (ing: { item_id?: string; group?: string }) =>
        ing.group === "Latte Base" && (ing.item_id === "nespresso_pod" || ing.item_id === "nespresso_double_pod");
      const firstPod = nespressoPrep.ingredients.findIndex(isPodLine);
      const vendorPod = {
        amount: count,
        unit: "pod",
        secondary_amount: ml,
        secondary_unit: ml ? "ml" : undefined,
        item: `Nespresso ${system === "original" ? "Original" : "Vertuo"} ${stated.raw_name}${/pod|capsule/i.test(stated.raw_name) ? "" : " pod"}`,
        item_id: ml && ml <= 45 ? "nespresso_pod" : "nespresso_double_pod",
        group: "Latte Base",
      };
      const withoutPods = nespressoPrep.ingredients.filter((ing) => !isPodLine(ing));
      withoutPods.splice(Math.max(0, firstPod), 0, vendorPod);
      nespressoPrep.ingredients = withoutPods;
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
    // Prefer the extractor's own one-line description; the template is only a fallback
    flavor_notes:
      ir.metadata.description ||
      `Rich espresso layered with smooth ${hasColdFoam ? "velvety cold foam" : isHot ? "steamed milk" : "cold milk"} and balanced sweetness.`,
    barista_note: hasColdFoam
      ? "Whip the cold foam first so it forms a stable, airy head before pouring espresso over ice."
      : isHot
      ? "Warm the mug first so the milk and coffee stay hot to the last sip."
      : "Pour espresso directly over ice to preserve the temperature boundary and prevent watery dilution.",
    status: "needs_testing",
    tags: [
      ir.metadata.temperature,
      // What kind of drink it is (a cappuccino isn't tagged "latte")
      drinkTypeTag(ir),
      ...(hasColdFoam ? ["cold-foam"] : []),
      // "-official" (not "-original", which reads as Nespresso's Original capsule line)
      vendorChannel ? `${vendorChannel}-official` : ir.source_type === "web" ? "web-find" : "viral-trend",
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

  const primaryMacros =
    originalChannel === "instant"
      ? instantMacros
      : originalChannel === "cometeer"
      ? cometeerMacros
      : nespressoMacros;
  const humanCaffeine = `~${(primaryMacros.caffeine_mg / 95).toFixed(1)} cups of coffee`;
  const humanSugar = `~${primaryMacros.sugar_g}g (${Math.round(primaryMacros.sugar_g / 4)} tsp sugar)`;

  // Superpowers Metadata
  const superpowers: TranslationSuperpowers = {
    hardware_brew_math: {
      // Same dose on every machine: 1 Vertuo Double = 1 Cometeer = 2 tsp instant
      cometeer: {
        summary: `${cometeerPlan.summary}.${cometeerPlan.strength_note ? ` ${cometeerPlan.strength_note}` : ""}`,
        ratio: `1 capsule = 1 Vertuo Double Espresso (dose: ${plural(dose.doubles, "double")})`,
        recommendation: cometeerTestedWith,
      },
      nespresso: {
        summary: `${nespressoPlan.summary}.`,
        ratio: `1 Double Espresso pod = 1 double (dose: ${plural(dose.doubles, "double")})`,
        pod_pick: nespressoTestedWith,
        system: "vertuo",
      },
      instant: {
        summary: `${instantPlan.summary}.`,
        ratio: `2 tsp instant espresso = 1 double (dose: ${plural(dose.doubles, "double")})`,
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
        ...(hasFlavorBase
          ? [
              {
                phaseNumber: hasColdFoam ? 2 : 1,
                name: "Flavor Base & Extraction",
                steps: [
                  "Add syrups, sweeteners, and seasonings directly to the serving glass.",
                  "Pour espresso over the flavor base and stir or froth to dissolve completely before adding ice.",
                ],
              },
              {
                phaseNumber: hasColdFoam ? 3 : 2,
                name: "Ice & Milk Pour",
                steps: [
                  "Fill glass with ice cubes over the dissolved coffee base.",
                  "Pour cold milk over the ice; stir gently.",
                ],
              },
            ]
          : [
              {
                phaseNumber: hasColdFoam ? 2 : 1,
                name: "Iced Milk Base",
                steps: [
                  "Fill glass with ice cubes.",
                  "Pour cold milk into the glass.",
                ],
              },
              {
                phaseNumber: hasColdFoam ? 3 : 2,
                name: "Coffee Pour",
                steps: [
                  "Pour chilled espresso directly over iced milk.",
                ],
              },
            ]),
        ...(hasColdFoam || nonCoffeeIngredients.some((i) => i.group === "Garnish")
          ? [
              {
                phaseNumber: (hasColdFoam ? 1 : 0) + (hasFlavorBase ? 2 : 2) + 1,
                name: "Crown & Garnish",
                steps: [
                  hasColdFoam
                    ? "Spoon cold foam over top and garnish."
                    : "Finish with garnish dusting.",
                ],
              },
            ]
          : []),
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
