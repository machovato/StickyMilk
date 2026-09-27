// Per-machine test-kitchen ratings survive the edit form round trip
// (recipe -> form draft -> saved recipe) and are validated.
// Run: npm run test:review-form

import Module from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Mock server-only for standalone runs (same approach as scripts/test-translator.ts)
const origRequire = (Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require;
(Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require = function (
  id: string,
  ...args: unknown[]
) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

import { draftToCandidate, recipeToDraft } from "../lib/recipe-draft";
import { validateRecipeCandidate } from "../lib/recipe-schema";
import type { Recipe } from "../lib/types";

const recipe: Recipe = JSON.parse(readFileSync("content/recipes/nespresso-tiramisu-cappuccino.json", "utf-8"));

test("per-machine scores and verdicts round-trip through the form", async () => {
  const { ingredientTaxonomyIds } = await import("../lib/taxonomy");
  const draft = recipeToDraft(recipe);
  draft.review = {
    ...draft.review,
    score: "8.5",
    verdict: "Tiramisu in a mug.",
    channel_scores: { nespresso: "9", cometeer: "8.5", instant: "" },
    channel_verdicts: { nespresso: "Nails it.", cometeer: "", instant: "" },
  };
  const saved = draftToCandidate(draft) as Recipe;
  // Only tasted machines are saved
  assert.deepEqual(saved.review?.channel_scores, { nespresso: 9, cometeer: 8.5 });
  assert.deepEqual(saved.review?.channel_verdicts, { nespresso: "Nails it." });
  assert.deepEqual(validateRecipeCandidate(saved, ingredientTaxonomyIds()), []);
  // And they load back into the form
  const reloaded = recipeToDraft(saved);
  assert.equal(reloaded.review.channel_scores.nespresso, "9");
  assert.equal(reloaded.review.channel_scores.instant, "");
  assert.equal(reloaded.review.channel_verdicts.nespresso, "Nails it.");
});

test("out-of-range or unknown-machine scores are rejected", async () => {
  const { ingredientTaxonomyIds } = await import("../lib/taxonomy");
  const bad = { ...recipe, review: { score: 8, verdict: "ok", channel_scores: { nespresso: 11, moka: 5 } } };
  const errors = validateRecipeCandidate(bad, ingredientTaxonomyIds()).map((e) => e.path);
  assert.ok(errors.includes("review.channel_scores.nespresso"));
  assert.ok(errors.includes("review.channel_scores.moka"));
});
