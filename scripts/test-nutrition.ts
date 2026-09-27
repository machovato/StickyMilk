// Guards for the taxonomy's nutrition data and the calculator, so silent
// zeros and silent 1:1 unit guesses can't come back.
// Run: npm run test:nutrition

import Module from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Mock server-only for standalone runs (same approach as scripts/test-translator.ts)
const origRequire = (Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require;
(Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require = function (
  id: string,
  ...args: unknown[]
) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

import { calculateNutrition, convertAmount, isKnownUnit } from "../lib/nutrition";
import type { Preparation } from "../lib/types";

interface Entry {
  id: string;
  name: string;
  aliases: string[];
  nutrition?: { per: { amount: number; unit: string } } | null;
  nutrition_note?: string;
}

const root = process.cwd();
const taxonomy: Entry[] = JSON.parse(readFileSync(path.join(root, "content/taxonomy/ingredients.json"), "utf-8"));
const recipesDir = path.join(root, "content/recipes");
const recipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, recipe: JSON.parse(readFileSync(path.join(recipesDir, f), "utf-8")) }));
const norm = (s: string) => s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();

test("the taxonomy passes the app's own load-time validator", async () => {
  const { getIngredientTaxonomy } = await import("../lib/taxonomy");
  assert.equal(getIngredientTaxonomy().length, taxonomy.length);
});

test("every entry has nutrition, or an explicit null with a reason", () => {
  for (const e of taxonomy) {
    assert.ok(e.nutrition !== undefined, `${e.id}: nutrition missing (would silently count as 0)`);
    if (e.nutrition === null) assert.ok(e.nutrition_note?.trim(), `${e.id}: null nutrition needs nutrition_note`);
    else assert.ok(isKnownUnit(e.nutrition.per.unit), `${e.id}: unknown per.unit "${e.nutrition.per.unit}"`);
  }
});

test("no alias belongs to two entries", () => {
  const owner = new Map<string, string>();
  for (const e of taxonomy) {
    for (const a of new Set([e.name, ...e.aliases].map(norm))) {
      assert.ok(!owner.has(a) || owner.get(a) === e.id, `"${a}" is on both ${owner.get(a)} and ${e.id}`);
      owner.set(a, e.id);
    }
  }
});

test("no too-generic single-word aliases (the start of matcher drift)", () => {
  const GENERIC = ["sauce", "syrup", "cream", "milk", "sugar", "juice", "powder", "topping", "foam", "drizzle", "water", "coffee", "espresso"];
  for (const e of taxonomy) {
    for (const a of e.aliases.map(norm)) {
      if (GENERIC.includes(a)) assert.equal(a, norm(e.name).split(" ").pop(), `${e.id}: generic alias "${a}"`);
    }
  }
});

test("every item_id in the vault exists in the taxonomy", () => {
  const ids = new Set(taxonomy.map((e) => e.id));
  for (const { file, recipe } of recipes)
    for (const p of recipe.preparations)
      for (const i of p.ingredients)
        if (i.item_id) assert.ok(ids.has(i.item_id), `${file}: unknown item_id "${i.item_id}"`);
});

test("every unit used by a linked vault ingredient converts", () => {
  for (const { file, recipe } of recipes)
    for (const p of recipe.preparations) {
      const bad = calculateNutrition(p).coverage.excluded.filter((x) => x.reason === "unit not convertible");
      assert.deepEqual(bad, [], `${file} [${p.channel}]`);
    }
});

test("unit conversion never guesses", () => {
  assert.equal(convertAmount(3, "teaspoons", "tbsp"), 1);
  assert.equal(convertAmount(1, "tablespoon", "tsp"), 3);
  assert.equal(convertAmount(2, "dash", "pinch"), 4);
  assert.equal(convertAmount(16, "piece", "cookie"), 16);
  assert.equal(convertAmount(1, undefined, "yolk"), 1);
  assert.equal(convertAmount(10, "g", "tbsp"), null, "grams need a density");
  assert.equal(convertAmount(1, "drizzle", "tbsp"), null);
  assert.equal(convertAmount(1, undefined, "tbsp"), null);
});

function prep(ingredients: Preparation["ingredients"], extra: Partial<Preparation> = {}): Preparation {
  return { channel: "instant", ingredients, steps: [], servings: 1, caffeine_level: "full", ...extra } as Preparation;
}

test("free text is excluded, not counted as zero; water counts as zero", () => {
  const n = calculateNutrition(
    prep([
      { amount: 6, unit: "oz", item: "whole milk", item_id: "milk" },
      { amount: 1, unit: "cup", item: "ice", item_id: "ice" },
      { amount: 2, unit: "oz", item: "Josie's cherry lime cold foam" },
    ])
  );
  assert.equal(n.coverage.counted, 2);
  assert.deepEqual(n.coverage.excluded, [{ item: "Josie's cherry lime cold foam", reason: "not in taxonomy" }]);
  assert.equal(n.calories, 111);
});

test("teaspoons are not counted as tablespoons", () => {
  const tsp = calculateNutrition(prep([{ amount: 3, unit: "teaspoon", item: "brown sugar", item_id: "brown_sugar" }]));
  const tbsp = calculateNutrition(prep([{ amount: 1, unit: "tbsp", item: "brown sugar", item_id: "brown_sugar" }]));
  assert.equal(tsp.calories, tbsp.calories);
});

test("caffeine scales with the amount", () => {
  const one = calculateNutrition(prep([{ amount: 1, unit: "tsp", item: "instant coffee", item_id: "instant_coffee" }]));
  const two = calculateNutrition(prep([{ amount: 2, unit: "tsp", item: "instant coffee", item_id: "instant_coffee" }]));
  assert.equal(two.caffeine_mg, one.caffeine_mg * 2);
});

test("'a dash' with no number counts as one dash", () => {
  const n = calculateNutrition(prep([{ unit: "dash", item: "cinnamon", item_id: "ground_cinnamon" }]));
  assert.equal(n.coverage.excluded.length, 0);
});
