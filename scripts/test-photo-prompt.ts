// Tests for the recipe photo prompt (lib/photo/prompt.ts): same house style
// every time, the right vessel and money shot per drink, props from the
// recipe's ingredients, and a different background mix per render.
// Run: npm run test:photo

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPhotoPlan, chooseMoment, chooseVessel, ingredientProps } from "../lib/photo/prompt";
import type { Recipe } from "../lib/types";

const load = (slug: string): Recipe => JSON.parse(readFileSync(`content/recipes/${slug}.json`, "utf-8"));

// A minimal recipe for rule tests
function recipe(partial: Partial<Recipe> & { items?: string[]; steps?: string[] }): Recipe {
  return {
    slug: "t",
    name: partial.name ?? "Test Drink",
    format: partial.format ?? "iced",
    flavor_notes: "Tasty.",
    status: "needs_testing",
    tags: partial.tags ?? [],
    sweetness_level: "subtle",
    preparations: [
      {
        channel: "nespresso",
        servings: 1,
        ingredients: (partial.items ?? ["6 oz milk"]).map((item) => ({ item })),
        steps: partial.steps ?? [],
      },
    ],
  } as unknown as Recipe;
}

test("Tiramisu Cappuccino: white cup, tall foam cap, props from its ingredients", () => {
  const r = load("nespresso-tiramisu-cappuccino");
  assert.equal(chooseVessel(r), "hot_milk");
  assert.equal(chooseMoment(r), "cappuccino");
  assert.ok(ingredientProps(r).length > 0 && ingredientProps(r).length <= 2);
});

test("iced drink with coffee poured over the milk gets the swirl money shot", () => {
  const r = recipe({ steps: ["Fill a glass with ice and milk.", "Brew the pod, then pour the espresso gently over the iced milk."] });
  assert.equal(chooseVessel(r), "iced");
  assert.equal(chooseMoment(r), "pour_swirl");
  // Milk poured over the coffee instead: marbled layers, not the swirl
  assert.equal(chooseMoment(recipe({ steps: ["Brew the pod into the glass.", "Add ice, then pour the milk over."] })), "iced_layers");
});

test("honey in the recipe puts a honey jar in the background", () => {
  const props = ingredientProps(recipe({ items: ["1 tbsp honey", "6 oz oat milk"] }));
  assert.match(props[0], /honey/);
  assert.match(props[1], /oat milk/);
});

test("tonics, affogatos, cold foam and black coffee get their own looks", () => {
  const tonic = recipe({ name: "Espresso Tonic", items: ["4 oz tonic water"] });
  assert.equal(chooseVessel(tonic), "short");
  assert.equal(chooseMoment(tonic), "layered_tonic");
  assert.equal(chooseMoment(recipe({ format: "affogato" as Recipe["format"], name: "Affogato" })), "affogato");
  assert.equal(chooseMoment(recipe({ tags: ["cold-foam"] })), "cold_foam");
  const black = recipe({ format: "hot", items: ["hot water"] });
  assert.equal(chooseVessel(black), "hot_black");
  assert.equal(chooseMoment(black), "black_coffee");
});

test("every render gets a different background mix; the same seed repeats exactly", () => {
  const r = load("nespresso-tiramisu-cappuccino");
  const mixes = new Set(Array.from({ length: 12 }, (_, i) => buildPhotoPlan(r, 1000 + i * 7919).background.join("|")));
  assert.ok(mixes.size >= 6, `only ${mixes.size} distinct staging mixes in 12 renders`);
  assert.deepEqual(buildPhotoPlan(r, 42).background, buildPhotoPlan(r, 42).background);
});

test("never more than 3 props, and the house style and exclusions are always in the prompt", () => {
  const r = recipe({ items: ["honey", "maple syrup", "cinnamon", "vanilla", "6 oz milk"] });
  for (let seed = 1; seed < 20; seed++) {
    const plan = buildPhotoPlan(r, seed);
    assert.ok(plan.ingredientProps.length + plan.background.length <= 3);
    assert.match(plan.prompt, /light oak butcher-block counter/);
    assert.match(plan.prompt, /NEVER INCLUDE:.*coffee machines/);
    // References set the style only; composition comes before the house style
    assert.match(plan.prompt, /Do NOT copy their layout/);
    assert.ok(plan.prompt.indexOf("COMPOSITION FOR THIS SHOT") < plan.prompt.indexOf("HOUSE STYLE"));
  }
});

test("compositions vary across renders too", () => {
  const r = load("nespresso-tiramisu-cappuccino");
  const comps = new Set(Array.from({ length: 12 }, (_, i) => buildPhotoPlan(r, 500 + i * 131).composition));
  assert.ok(comps.size >= 3);
});

test("generator end to end with a simulated Gemini: sends the anchors, returns a 1200x1200 JPEG", async () => {
  // server-only guard off for this standalone run
  const Module = (await import("node:module")).default as unknown as { prototype: { require: (id: string) => unknown } };
  const orig = Module.prototype.require;
  Module.prototype.require = function (this: unknown, id: string) {
    return id === "server-only" ? {} : orig.call(this, id);
  } as typeof orig;

  const sharp = (await import("sharp")).default;
  const fakeImage = (await sharp({ create: { width: 800, height: 600, channels: 3, background: "#c8a27a" } }).png().toBuffer()).toString("base64");
  let sentParts: Array<{ inlineData?: unknown; text?: string }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    sentParts = JSON.parse(init?.body ?? "{}").contents?.[0]?.parts ?? [];
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: fakeImage } }] } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  process.env.GEMINI_API_KEY = "test-key";
  process.env.PHOTO_MODELS = "gemini-2.5-flash-image";
  try {
    const { generatePhoto } = await import("../lib/photo/generate");
    const res = await generatePhoto("a test prompt");
    assert.ok(res.ok, JSON.stringify(res));
    if (!res.ok) return;
    const meta = await sharp(Buffer.from(res.jpegBase64, "base64")).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 1200);
    assert.equal(sentParts[0]?.text, "a test prompt");
    assert.equal(sentParts.filter((p) => p.inlineData).length, 2, "both anchor photos sent");
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.PHOTO_MODELS;
    Module.prototype.require = orig;
  }
});

test("Ca Phe Sua Da: condensed-milk money shot and a condensed-milk prop", () => {
  const r = load("ca-phe-sua-da");
  assert.equal(chooseMoment(r), "condensed_milk");
  assert.match(ingredientProps(r)[0] ?? "", /condensed milk/);
});

test("candidates shown side by side always get different compositions", () => {
  const r = load("ca-phe-sua-da");
  const a = buildPhotoPlan(r, 1, { composition: 3 });
  const b = buildPhotoPlan(r, 2, { composition: 4 });
  assert.notEqual(a.composition, b.composition);
});

test("the towel is no longer in every shot", () => {
  const r = load("ca-phe-sua-da");
  const withTowel = Array.from({ length: 20 }, (_, i) => buildPhotoPlan(r, 900 + i * 131)).filter((p) => /towel/.test(p.prompt)).length;
  assert.ok(withTowel < 20, "towel appears in every render");
});

// A brief like the art director would write for Ca Phe Sua Da
const CPSD_BRIEF = {
  tell: "Jet-black coffee floating on a thick white layer of condensed milk over ice.",
  vessel: "short_faceted",
  colors: "jet-black coffee over ivory condensed milk; stirred: light caramel tan",
  hero_detail: "a long spoon standing in the glass, ready to stir",
  story_prop: "a small glass jar of condensed milk with a spoon in it",
  stages: { before: "Unstirred: black coffee over a white condensed-milk layer.", after: "Stirred: light caramel tan throughout." },
  created_at: "2026-09-28T00:00:00Z",
};

test("with a brief: its glass, tell, colors and story prop drive the prompt", () => {
  const r = load("ca-phe-sua-da");
  const plan = buildPhotoPlan(r, 7, { composition: 0, brief: CPSD_BRIEF });
  assert.equal(plan.vessel, "short_faceted");
  assert.match(plan.prompt, /short, chunky clear faceted tumbler/);
  assert.match(plan.prompt, /THE TELL: Jet-black coffee floating/);
  assert.match(plan.prompt, /COLORS: jet-black coffee over ivory/);
  assert.equal(plan.ingredientProps[0], CPSD_BRIEF.story_prop);
  assert.match(plan.prompt, /version people picture/);
});

test("before/after stages give each candidate its own look", () => {
  const r = load("ca-phe-sua-da");
  const before = buildPhotoPlan(r, 7, { brief: CPSD_BRIEF, stage: "before" });
  const after = buildPhotoPlan(r, 8, { brief: CPSD_BRIEF, stage: "after" });
  assert.match(before.prompt, /THE TELL: Unstirred/);
  assert.match(after.prompt, /THE TELL: Stirred: light caramel tan/);
  assert.equal(before.moment, "brief: before");
});

test("the editor's note is added for that render, after the staging, and never overrides NEVER", () => {
  const r = load("ca-phe-sua-da");
  const plan = buildPhotoPlan(r, 7, { brief: CPSD_BRIEF, note: "put it in a tall 8-ball glass" });
  assert.match(plan.prompt, /ART DIRECTION FOR THIS RENDER.*never break the NEVER INCLUDE list\): put it in a tall 8-ball glass/);
  assert.ok(plan.prompt.indexOf("ART DIRECTION") > plan.prompt.indexOf("STAGING FOR THIS SHOT"));
  assert.ok(plan.prompt.indexOf("NEVER INCLUDE") > plan.prompt.indexOf("ART DIRECTION"));
  // No note, no art-direction section
  assert.doesNotMatch(buildPhotoPlan(r, 7).prompt, /ART DIRECTION/);
  // Long notes are capped
  const long = buildPhotoPlan(r, 7, { note: "x".repeat(1000) }).prompt;
  assert.ok(!long.includes("x".repeat(301)));
});

test("art director: brand guardrails are enforced on its answer, and it runs end to end", async () => {
  const Module = (await import("node:module")).default as unknown as { prototype: { require: (id: string) => unknown } };
  const orig = Module.prototype.require;
  Module.prototype.require = function (this: unknown, id: string) {
    return id === "server-only" ? {} : orig.call(this, id);
  } as typeof orig;
  try {
    const { sanitizeBrief, generatePhotoBrief } = await import("../lib/photo/brief");
    // Brewing gear, labels and clichés are dropped as props; unknown vessels fall back
    const b = sanitizeBrief({ tell: "t", vessel: "martini_glass", colors: "c", hero_detail: "h", story_prop: "a Vietnamese phin filter on top", has_stages: false });
    assert.equal(b.story_prop, undefined);
    assert.equal(b.vessel, "iced");
    assert.equal(b.stages, undefined);

    // Simulated Gemini text response
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ ...CPSD_BRIEF, has_stages: true, stage_before: "layered", stage_after: "stirred" }) }] } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;
    process.env.GEMINI_API_KEY = "test-key";
    try {
      const res = await generatePhotoBrief(load("ca-phe-sua-da"));
      assert.ok(res.ok, JSON.stringify(res));
      if (res.ok) {
        assert.equal(res.brief.vessel, "short_faceted");
        assert.deepEqual(res.brief.stages, { before: "layered", after: "stirred" });
      }
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.GEMINI_API_KEY;
    }
  } finally {
    Module.prototype.require = orig;
  }
});
