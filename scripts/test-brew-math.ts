// Tests for the dose-matched coffee conversion (lib/translator/brew-math.ts)
// and its use in synthesis. Rule of thumb being tested:
//   1 Vertuo Double Espresso = 1 Cometeer capsule = 2 tsp instant = 2 shots
// Run: npm run test:brew-math

import Module from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

// Mock server-only for standalone runs (same approach as scripts/test-translator.ts)
const origRequire = (Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require;
(Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require = function (
  id: string,
  ...args: unknown[]
) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

import { cometeerFor, doseFromStated, instantFor, nespressoFor } from "../lib/translator/brew-math";
import type { IRStatedCoffee, RecipeIR } from "../lib/translator/types";

// Helper: the three machine plans for a stated coffee, as a compact summary
function plans(stated: IRStatedCoffee, opts = { hot: false, hasMilk: true }) {
  const dose = doseFromStated(stated);
  return {
    doubles: dose.doubles,
    nespresso: nespressoFor(dose).summary,
    cometeer: cometeerFor(dose, opts).capsules,
    instant: instantFor(dose).tsp,
  };
}

test("1 Vertuo Double Espresso = 1 Cometeer = 2 tsp instant", () => {
  assert.deepEqual(plans({ raw_name: "Double Espresso Chiaro", system: "vertuo", capsule_count: 1, serving_size_ml: 80 }), {
    doubles: 1,
    nespresso: "1 Double Espresso pod (80 ml)",
    cometeer: 1,
    instant: 2,
  });
});

test("doses are linear: 2 doubles = 2 Cometeer = 4 tsp", () => {
  const p = plans({ raw_name: "Double Espresso Scuro", system: "vertuo", capsule_count: 2, serving_size_ml: 80 });
  assert.equal(p.cometeer, 2);
  assert.equal(p.instant, 4);
  assert.equal(p.nespresso, "2 Double Espresso pods (80 ml)");
});

test("espresso shots: 2 shots = 1 double; 4 shots = 2 doubles", () => {
  assert.equal(plans({ raw_name: "espresso", system: "espresso", capsule_count: 2 }).cometeer, 1);
  assert.equal(plans({ raw_name: "espresso", system: "espresso", capsule_count: 4 }).cometeer, 2);
  // Reels report "shots" without a count
  assert.equal(plans({ raw_name: "espresso", shots: 4 }).nespresso, "2 Double Espresso pods (80 ml)");
});

test("half doses: Vertuo Espresso 40 ml -> 1 capsule (can't split), 1 tsp", () => {
  const stated: IRStatedCoffee = { raw_name: "Voltesso", system: "vertuo", capsule_count: 1, serving_size_ml: 40 };
  const p = plans(stated);
  assert.equal(p.doubles, 0.5);
  assert.equal(p.nespresso, "1 Espresso pod (40 ml)");
  assert.equal(p.cometeer, 1);
  assert.equal(p.instant, 1);
  assert.match(cometeerFor(doseFromStated(stated), { hot: false, hasMilk: true }).strength_note ?? "", /stronger/);
});

test("3 shots -> 1 Double + 1 Espresso pod, 2 capsules, 3 tsp", () => {
  const p = plans({ raw_name: "espresso", system: "espresso", capsule_count: 3 });
  assert.equal(p.nespresso, "1 Double Espresso pod (80 ml) + 1 Espresso pod (40 ml)");
  assert.equal(p.cometeer, 2);
  assert.equal(p.instant, 3);
});

test("Nespresso Original pod is a single shot", () => {
  assert.equal(plans({ raw_name: "Il Caffè", system: "original", capsule_count: 2 }).nespresso, "1 Double Espresso pod (80 ml)");
});

test("Cometeer and instant sources convert back", () => {
  assert.equal(plans({ raw_name: "Hologram", system: "capsule", capsule_count: 1 }).nespresso, "1 Double Espresso pod (80 ml)");
  assert.equal(plans({ raw_name: "instant", system: "instant", capsule_count: 4 }).cometeer, 2);
});

test("brewed coffee (Vertuo Mug) keeps its volume with water; milk drinks never get water", () => {
  const mug = doseFromStated({ raw_name: "Melozio", system: "vertuo", capsule_count: 1, serving_size_ml: 230 });
  assert.equal(mug.style, "brewed");
  assert.equal(nespressoFor(mug).summary, "1 Vertuo Mug pod (230 ml)");
  const plainHot = cometeerFor(mug, { hot: true, hasMilk: false });
  assert.equal(plainHot.state, "frozen", "plain hot coffee is the one frozen case");
  assert.equal(plainHot.water_oz, 8);
  const latte = cometeerFor(doseFromStated({ raw_name: "x", system: "vertuo", capsule_count: 1, serving_size_ml: 80 }), { hot: true, hasMilk: true });
  assert.equal(latte.state, "melted");
  assert.equal(latte.water_oz, undefined);
});

test("synthesis: a 2-double reel becomes 2 capsules, 2 Double pods, 4 tsp, and caffeine is reported", async () => {
  const { synthesizeRecipe } = await import("../lib/translator/synthesis");
  const ir: RecipeIR = {
    source_type: "social_tiktok",
    source_url: "https://www.tiktok.com/@x/video/1",
    source_creator: { name: "x", handle: "@x", platform: "TikTok" },
    generated_slug: "x-quad-latte",
    raw_title: "Quad Shot Iced Latte",
    stated_coffee: { raw_name: "Double Espresso Scuro", system: "vertuo", shots: 4 },
    raw_ingredients: [
      { amount: 6, unit: "oz", item: "whole milk", group: "Latte Base" },
      { amount: 1, unit: "cup", item: "ice", group: "Latte Base" },
    ],
    raw_steps: [],
    metadata: { temperature: "iced" },
  };
  const r = synthesizeRecipe(ir);
  assert.deepEqual(r.validation_errors, []);
  const coffee = (ch: string) =>
    r.recipe.preparations.find((p) => p.channel === ch)!.ingredients.filter((i) => /pod|capsule|instant/.test(i.item_id ?? ""));
  assert.equal(coffee("cometeer")[0].amount, 2);
  assert.equal(coffee("cometeer")[0].item, "Cometeer capsule, melted");
  assert.equal(coffee("nespresso")[0].amount, 2);
  assert.equal(coffee("instant")[0].amount, 4);
  // 2 capsules is a lot of caffeine: reported honestly, with the Half Caff hint
  assert.equal(r.nutritional_breakdowns.cometeer.caffeine_mg, 360);
  assert.match(coffee("cometeer")[0].notes ?? "", /Half Caff/);
  // No water added to a milk drink on any machine
  assert.ok(!r.recipe.preparations.some((p) => p.ingredients.some((i) => /water/.test(i.item) && !/bloom/.test(i.secondary_unit ?? ""))));
});
