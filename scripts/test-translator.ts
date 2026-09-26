import Module from "node:module";

// Mock server-only for standalone test runner
const origRequire = (Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require;
(Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require = function (
  id: string,
  ...args: unknown[]
) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

async function run() {
  const { DEMO_PRESETS, extractRecipeIR } = await import("../lib/translator/extractor");
  const { synthesizeRecipe } = await import("../lib/translator/synthesis");
  const { validateRecipeCandidate } = await import("../lib/recipe-schema");
  const { ingredientTaxonomyIds } = await import("../lib/taxonomy");

  console.log("=== RUNNING COFFEE TRANSLATOR ENGINE TESTS ===");

  const taxonomyIds = ingredientTaxonomyIds();
  console.log(`Taxonomy Loaded: ${taxonomyIds.size} canonical ingredient IDs.`);

  for (const preset of DEMO_PRESETS) {
    console.log(`\nTesting Preset: ${preset.label}...`);

    // Stage 0: Extraction
    const ir = extractRecipeIR({ url: preset.url, caption: preset.caption });
    console.log(`  [Stage 0] Extracted Title: "${ir.raw_title}"`);
    console.log(`  [Stage 0] Creator: ${ir.source_creator?.name} (${ir.source_creator?.handle}) on ${ir.source_creator?.platform}`);
    console.log(`  [Stage 0] Generated Slug: "${ir.generated_slug}"`);
    console.log(`  [Stage 0] Ingredients Count: ${ir.raw_ingredients.length}`);
    console.log(`  [Stage 0] Sub-assemblies: ${ir.sub_assemblies?.map((s) => s.name).join(", ")}`);

    // Stage 1 & 2: Synthesis
    const result = synthesizeRecipe(ir);
    console.log(`  [Stage 1 & 2] Roast Recommendation: ${result.recipe.preparations[0].roast_recommendation}`);
    console.log(`  [Stage 1 & 2] Preparations generated: ${result.recipe.preparations.map((p) => p.channel).join(", ")}`);

    // Superpowers Verification
    console.log(`  [Superpower 1] Cometeer Ratio: ${result.superpowers.hardware_brew_math.cometeer.ratio}`);
    console.log(`  [Superpower 1] Vertuo Pod: ${result.superpowers.hardware_brew_math.nespresso.pod_pick}`);
    console.log(`  [Superpower 1] Instant Ratio: ${result.superpowers.hardware_brew_math.instant.ratio}`);

    console.log(`  [Superpower 2] Calories: ${result.superpowers.nutritional_reality.calories} kcal`);
    console.log(`  [Superpower 2] Sugar: ${result.superpowers.nutritional_reality.sugar_g}g (${result.superpowers.nutritional_reality.human_sugar_ref})`);
    console.log(`  [Superpower 2] Caffeine: ${result.superpowers.nutritional_reality.caffeine_mg}mg (${result.superpowers.nutritional_reality.human_caffeine_ref})`);
    console.log(`  [Superpower 2] Protein: ${result.superpowers.nutritional_reality.protein_g}g`);

    console.log(`  [Superpower 3] Mise en place phases: ${result.superpowers.mise_en_place.phases.map((p) => `P${p.phaseNumber}:${p.name}`).join(" -> ")}`);

    // Stage 3: Deterministic Schema Validation
    const errors = validateRecipeCandidate(result.recipe, taxonomyIds);
    if (errors.length > 0) {
      console.error(`  ❌ [Stage 3] Validation FAILED with ${errors.length} errors:`, errors);
      process.exit(1);
    } else {
      console.log(`  ✅ [Stage 3] validateRecipeCandidate PASSED (0 errors).`);
    }
  }

  // Test Custom Unstructured Social Caption with Novel Ingredient
  console.log("\nTesting Custom Unstructured Caption with Novel Ingredient Fallback...");
  const customInput = {
    url: "https://www.tiktok.com/@barista_sam/video/7891234567890",
    caption: `Blackberry Honey Iced Latte 🫐🍯
A specialty drink with homemade wild blackberry syrup!

Base:
- 1 cup ice
- 5 oz oat milk
- 2 tbsp wild blackberry puree
- 1 tbsp raw honey
- 1 double espresso shot (medium roast)

Garnish:
- 3 fresh blackberries

Steps:
1. Add blackberry puree and honey to the glass.
2. Add ice and pour in cold oat milk.
3. Pull double espresso shot over ice.
4. Top with fresh blackberries.`,
  };

  const customIr = extractRecipeIR(customInput);
  const customResult = synthesizeRecipe(customIr);
  console.log(`  Extracted Title: "${customResult.recipe.name}"`);
  console.log(`  Slug: "${customResult.recipe.slug}"`);
  console.log(`  Warnings (Novel ingredients):`, customResult.warnings);

  const customErrors = validateRecipeCandidate(customResult.recipe, taxonomyIds);
  if (customErrors.length > 0) {
    console.error("  ❌ Custom recipe validation failed:", customErrors);
    process.exit(1);
  } else {
    console.log("  ✅ Custom recipe with novel ingredients passed schema validation (0 errors).");
  }

  console.log("\n🎉 ALL TRANSLATOR TESTS PASSED WITH 100% SUCCESS!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
