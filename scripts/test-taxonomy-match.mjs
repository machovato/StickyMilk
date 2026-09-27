// Unit tests for lib/translator/taxonomy-match.ts against the real taxonomy.
// Run with: node --experimental-strip-types --test scripts/test-taxonomy-match.mjs
// (Node 22.6+; plain .mjs so it needs no extra test runner.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { matchTaxonomy } from "../lib/translator/taxonomy-match.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const taxonomy = JSON.parse(
  readFileSync(path.join(root, "content", "taxonomy", "ingredients.json"), "utf-8")
);

const cases = [
  // Regressions: the old substring matcher got every one of these wrong.
  ["pumpkin spice sauce", undefined],
  ["iced cinnamon dolce syrup", undefined],
  ["spiced apple juice", undefined],
  ["oat milk", "oat_milk"],
  ["milk chocolate shavings", undefined],
  ["coconut cream", undefined],

  // Common extractions that must keep matching.
  ["ice", "ice"],
  ["Ice", "ice"],
  ["ice cubes", "ice"],
  ["crushed ice", "ice"],
  ["whole milk", "milk"],
  ["cold whole milk", "milk"],
  ["2% milk", "milk"],
  ["heavy cream", "heavy_cream"],
  ["heavy whipping cream", "heavy_cream"],
  ["flaky sea salt", "flaky_salt"],
  ["brown sugar", "brown_sugar"],
  ["brown sugar, packed", "brown_sugar"],
  ["maple syrup", "maple_syrup"],
  ["maple syrup drizzle", "maple_syrup"],
  ["vanilla syrup (homemade)", "vanilla_syrup"],
  ["salted caramel sauce", "caramel_sauce"],
  ["caramel syrup", "salted_caramel_syrup"],
  ["Biscoff cookie butter", "cookie_butter"],
  ["Fairlife vanilla protein shake", "vanilla_protein_shake"],
  ["vanilla ice cream", "vanilla_ice_cream"],
  ["sweetened condensed milk", "sweetened_condensed_milk"],
  ["cinnamon", "ground_cinnamon"],
  ["a dash of cinnamon", "ground_cinnamon"],
  ["sugar or honey", "sugar"],
  ["cold whole milk or oat milk", "milk"],
  ["mascarpone cheese", "mascarpone"],
  ["chocolate ice cream", undefined],
  ["Chobani Cookie Butter creamer", undefined],
  // Cinnamon sugar is mostly sugar; matching the head noun is the right call for nutrition.
  ["cinnamon sugar", "sugar"],
];

for (const [input, expected] of cases) {
  test(`${JSON.stringify(input)} -> ${expected ?? "novel"}`, () => {
    const result = matchTaxonomy(input, taxonomy);
    assert.equal(result.id, expected);
    assert.equal(result.is_novel, expected === undefined);
  });
}

test("every taxonomy name and alias matches its own entry", () => {
  for (const entry of taxonomy) {
    for (const text of [entry.id, entry.name, ...entry.aliases]) {
      assert.equal(matchTaxonomy(text, taxonomy).id, entry.id, `"${text}"`);
    }
  }
});
