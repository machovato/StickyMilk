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

import assert from "node:assert/strict";
import type { SubmissionView } from "../components/SubmissionQueue";

async function runTests() {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { extractRecipeIR } = await import("../lib/translator/extractor");
  const { synthesizeRecipe } = await import("../lib/translator/synthesis");
  const { calculateNutrition } = await import("../lib/nutrition");
  const { getIngredientTaxonomy, ingredientTaxonomyIds } = await import("../lib/taxonomy");
  const { matchTaxonomy } = await import("../lib/translator/taxonomy-match");

  console.log("=================================================");
  console.log("🧪 RUNNING STICKYMILK INGESTION & QUEUE TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     `, err instanceof Error ? err.message : err);
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     `, err instanceof Error ? err.message : err);
    }
  }

  // -------------------------------------------------------------
  // Test Section 1: Ingestion & Caption Extraction
  // -------------------------------------------------------------
  console.log("--- 1. Ingestion Pipeline & Caption Measurements ---");

  const sampleCaption = `Salted honey maple iced latte 🍁

Perfect for the summer to fall transition.

Ingredients:
• 0.5oz maple syrup 
• 0.5oz honey 
• Dash of cinnamon 
• Dash of salt 
• 2oz espresso 
• 6-8oz milk
• 1 cup ice`;

  const sampleUrl = "https://www.instagram.com/p/DNqes0Zu54V/";

  const ir = extractRecipeIR({ url: sampleUrl, caption: sampleCaption });

  test("Extracts clean title from reel caption", () => {
    assert.ok(ir.raw_title.toLowerCase().includes("salted honey maple"));
  });

  test("Extracts measurements (amounts & units) from reel caption", () => {
    const maple = ir.raw_ingredients.find((i) => i.item.toLowerCase().includes("maple"));
    assert.ok(maple, "Maple syrup not found in extracted ingredients");
    assert.equal(maple.amount, 0.5);
    assert.equal(maple.unit, "oz");

    const honey = ir.raw_ingredients.find((i) => i.item.toLowerCase().includes("honey"));
    assert.ok(honey, "Honey not found in extracted ingredients");
    assert.equal(honey.amount, 0.5);
    assert.equal(honey.unit, "oz");

    const milk = ir.raw_ingredients.find((i) => i.item.toLowerCase().includes("milk"));
    assert.ok(milk, "Milk not found");
    assert.ok(milk.amount === 6 || milk.amount === 7 || milk.amount === 8);
    assert.equal(milk.unit, "oz");
  });

  // -------------------------------------------------------------
  // Test Section 2: Taxonomy & Co-located Nutrition
  // -------------------------------------------------------------
  console.log("\n--- 2. Taxonomy & Co-located Nutrition Benchmarks ---");

  const taxonomy = getIngredientTaxonomy();
  const taxIds = ingredientTaxonomyIds();

  test("Taxonomy contains canonical 'honey' with USDA nutrition", () => {
    assert.ok(taxIds.has("honey"), "honey ID missing from taxonomy");
    const honeyEntry = taxonomy.find((e) => e.id === "honey");
    assert.ok(honeyEntry, "Honey entry missing");
    assert.ok(honeyEntry.nutrition, "Honey nutrition block missing");
    assert.equal(honeyEntry.nutrition.source, "usda");
    assert.ok(honeyEntry.nutrition.calories > 0, "Honey calories must be > 0");
    assert.ok(honeyEntry.nutrition.sugar_g > 0, "Honey sugar must be > 0");
  });

  test("Taxonomy matcher maps 'Honey' to canonical id 'honey'", () => {
    const match = matchTaxonomy("Honey", taxonomy);
    assert.equal(match.id, "honey");
    assert.equal(match.is_novel, false);
  });

  test("Taxonomy matcher maps 'raw honey' and 'wildflower honey' aliases", () => {
    assert.equal(matchTaxonomy("raw honey", taxonomy).id, "honey");
    assert.equal(matchTaxonomy("wildflower honey", taxonomy).id, "honey");
  });

  test("Pinch antipattern is retired: 'pinch of salt' resolves to salt", () => {
    assert.ok(!taxIds.has("pinch_of_salt"), "pinch_of_salt ID should be retired");
    assert.ok(!taxIds.has("pinch_of_cinnamon"), "pinch_of_cinnamon ID should be retired");
    assert.equal(matchTaxonomy("pinch of salt", taxonomy).id, "salt");
  });

  // -------------------------------------------------------------
  // Test Section 3: Synthesis, Multi-Channel Formulations & Coverage
  // -------------------------------------------------------------
  console.log("\n--- 3. Recipe Synthesis & Honest Nutrition Coverage ---");

  const result = synthesizeRecipe(ir);

  test("Synthesizes all 3 channels: Cometeer, Nespresso, Instant", () => {
    const channels = result.recipe.preparations.map((p) => p.channel);
    assert.ok(channels.includes("cometeer"));
    assert.ok(channels.includes("nespresso"));
    assert.ok(channels.includes("instant"));
  });

  test("All ingredients in Salted Honey Maple Latte are linked (0 novel warnings)", () => {
    const novelWarnings = result.warnings.filter((w) => w.includes("Novel ingredient"));
    assert.equal(novelWarnings.length, 0, `Unexpected novel warnings: ${novelWarnings.join("; ")}`);
  });

  test("Honest nutrition reports 100% coverage (0 excluded) for linked recipe", () => {
    const cometeerPrep = result.recipe.preparations.find((p) => p.channel === "cometeer")!;
    const nutrition = calculateNutrition(cometeerPrep);
    assert.ok(nutrition.calories > 150, `Expected >150 cal, got ${nutrition.calories}`);
    assert.ok(nutrition.sugar_g > 20, `Expected >20g sugar, got ${nutrition.sugar_g}`);
    assert.ok(nutrition.caffeine_mg > 100, `Expected >100mg caffeine, got ${nutrition.caffeine_mg}`);
    assert.equal(nutrition.coverage.excluded.length, 0, "No items should be excluded");
    assert.ok(nutrition.coverage.counted >= 5, "Counted items should be >= 5");
  });

  test("Honest nutrition flags novel ingredients in coverage.excluded", () => {
    // Clone preparation and add an unlinked novel item
    const prepWithNovel = {
      ...result.recipe.preparations[0],
      ingredients: [
        ...result.recipe.preparations[0].ingredients,
        { item: "Josie's Cherry Lime Cold Foam", group: "Cold Foam" },
      ],
    };
    const nutrition = calculateNutrition(prepWithNovel);
    const excludedItem = nutrition.coverage.excluded.find((e) =>
      e.item.includes("Josie's Cherry Lime Cold Foam")
    );
    assert.ok(excludedItem, "Novel item must appear in nutrition.coverage.excluded");
    assert.equal(excludedItem.reason, "not in taxonomy");
  });

  // -------------------------------------------------------------
  // Test Section 4: Database Submission & Review Drawer Contract
  // -------------------------------------------------------------
  console.log("\n--- 4. SQLite Queue & Review Drawer Data Contract ---");

  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  await asyncTest("Database has pending submissions waiting for review", async () => {
    let pending = await prisma.submission.findMany({ where: { status: "pending" } });
    if (pending.length === 0) {
      // Seed a draft from synthesized test result if queue was emptied by admin approval
      await prisma.submission.create({
        data: {
          url: sampleUrl,
          name: result.recipe.name,
          result: JSON.stringify(result),
        },
      });
      pending = await prisma.submission.findMany({ where: { status: "pending" } });
    }
    assert.ok(pending.length > 0, "Expected at least 1 pending submission in DB");
    console.log(`     Found ${pending.length} pending submission(s) in review queue.`);
  });

  await asyncTest("Pending submission matches Review Drawer SubmissionView contract", async () => {
    const sub = await prisma.submission.findFirst({ where: { status: "pending" } });
    assert.ok(sub);
    const parsed = JSON.parse(sub.result);

    // Verify SubmissionView shape used by components/SubmissionQueue.tsx
    const view: SubmissionView = {
      id: sub.id,
      url: sub.url,
      name: sub.name,
      submittedAt: sub.createdAt.toISOString(),
      creator: parsed.recipe.source?.handle || parsed.recipe.source?.name,
      platform: parsed.recipe.source?.platform,
      image: parsed.ir.hero_frame_base64
        ? `data:image/jpeg;base64,${parsed.ir.hero_frame_base64}`
        : parsed.ir.thumbnail_url,
      format: parsed.recipe.format,
      preparations: parsed.recipe.preparations.map((p: any) => ({
        channel: p.channel,
        ingredients: p.ingredients.map((i: any) =>
          [i.amount, i.unit, i.item].filter((x: any) => x !== undefined && x !== "").join(" ")
        ),
      })),
      warnings: parsed.warnings || [],
      recipe: parsed.recipe,
    };

    assert.ok(view.id, "Missing submission ID");
    assert.ok(view.name, "Missing submission name");
    assert.ok(view.recipe, "Missing full recipe for Drawer");
    assert.ok(view.recipe.preparations.length === 3, "Recipe in Drawer must have 3 preparations");
    assert.ok(view.recipe.preparations[0].steps.length > 0, "Preparation must have steps");
    assert.ok(view.recipe.flavor_notes, "Recipe must have flavor notes");
    console.log(`     Validated review drawer payload for "${view.name}".`);
  });

  await prisma.$disconnect();

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED`);
  if (passed === total) {
    console.log("🎉 ALL INGESTION, TAXONOMY, NUTRITION & QUEUE TESTS PASSED!");
  } else {
    console.error(`⚠️ ${total - passed} TEST(S) FAILED`);
    process.exit(1);
  }
  console.log("=================================================\n");
}

runTests().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
