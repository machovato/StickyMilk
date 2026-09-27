// Tests for recipe-page import (vendor + blog pages) and the SSRF guard.
// Run: npm run test:import   (no network, no Gemini key needed: JSON-LD path)

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
delete process.env.GEMINI_API_KEY;

function page(recipe: object, head = ""): string {
  return `<!doctype html><html><head>${head}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "x" }, recipe] })}</script>
</head><body><h1>Recipe</h1></body></html>`;
}

// WordPress + WP Recipe Maker shape: @graph, author object, HTML entities, og:site_name
const BLOG_ESPRESSO = page(
  {
    "@type": "Recipe",
    name: "Iced Brown Sugar Oat Milk Shaken Espresso",
    author: { "@type": "Person", name: "Jane Doe" },
    recipeIngredient: [
      "2 shots espresso",
      "1 tablespoon brown sugar",
      "1/2 cup oat milk",
      "1 cup ice",
      "&#189; tsp ground cinnamon",
    ],
    recipeInstructions: [{ "@type": "HowToStep", text: "Shake espresso with sugar and ice." }],
  },
  `<meta property="og:site_name" content="Jane&#8217;s Coffee Corner" />`
);

const BLOG_COLD_BREW = page({
  "@type": ["Recipe"],
  name: "Vanilla Sweet Cream Cold Brew",
  publisher: { "@type": "Organization", name: "Brew Better" },
  recipeIngredient: ["1 cup cold brew concentrate", "2 tbsp heavy cream", "1 tbsp vanilla syrup", "ice"],
});

const BLOG_NOT_COFFEE = page({
  "@type": "Recipe",
  name: "Banana Bread",
  recipeIngredient: ["3 ripe bananas", "2 cups flour", "1 tsp baking soda"],
});

const BLOG_COFFEE_LIQUEUR_ONLY = page({
  "@type": "Recipe",
  name: "White Russian",
  recipeIngredient: ["2 oz vodka", "1 oz coffee liqueur", "1 oz heavy cream"],
});

const VENDOR = page({
  "@type": "Recipe",
  name: "Nespresso Vertuo on ice macchiato",
  recipeIngredient: ["1 Melozio capsule (230 ml)", "3 oz half and half", "6 ice cubes"],
});

async function load() {
  const x = await import("../lib/translator/recipe-page-extractor");
  const { synthesizeRecipe } = await import("../lib/translator/synthesis");
  const { isPrivateAddress, checkPublicUrl } = await import("../lib/safe-fetch");
  return { ...x, synthesizeRecipe, isPrivateAddress, checkPublicUrl };
}

test("URL routing: social videos go to video-ai, everything else is a recipe page", async () => {
  const { isRecipePageUrl, detectVendor } = await load();
  assert.equal(isRecipePageUrl("https://www.tiktok.com/@a/video/1"), false);
  assert.equal(isRecipePageUrl("https://www.instagram.com/reel/abc/"), false);
  assert.equal(isRecipePageUrl("https://youtu.be/abc"), false);
  assert.equal(isRecipePageUrl("https://m.youtube.com/shorts/abc"), false);
  assert.equal(isRecipePageUrl("https://janescoffee.com/iced-latte/"), true);
  assert.equal(isRecipePageUrl("ftp://janescoffee.com/x"), false);
  assert.equal(isRecipePageUrl("not a url"), false);
  assert.equal(detectVendor("https://www.nespresso.com/recipes/us/en/x.html"), "nespresso");
  assert.equal(detectVendor("https://cometeer.com/blogs/recipes/x"), "cometeer");
  assert.equal(detectVendor("https://notnespresso.com/x"), null);
});

test("blog page with espresso: attribution, coffee base, all three channels", async () => {
  const { extractRecipePage, synthesizeRecipe } = await load();
  const r = await extractRecipePage("https://janescoffee.com/shaken-espresso/", BLOG_ESPRESSO);
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.method, "json_ld");
  assert.equal(r.vendor, null);
  assert.equal(r.ir.source_type, "web");
  assert.equal(r.ir.source_creator?.name, "Jane Doe");
  assert.equal(r.ir.source_creator?.platform, "Jane’s Coffee Corner");
  assert.equal(r.ir.stated_coffee.system, "espresso");
  assert.equal(r.ir.stated_coffee.shots, 2);
  assert.equal(r.ir.metadata.temperature, "iced");
  assert.equal(r.ir.raw_steps.length, 0, "published instructions must not be stored verbatim");
  assert.ok(!r.ir.raw_ingredients.some((i) => /espresso/i.test(i.item)), "coffee base is not an ingredient");
  const cinnamon = r.ir.raw_ingredients.find((i) => /cinnamon/.test(i.item));
  assert.equal(cinnamon?.amount, 0.5, "HTML entity fraction decoded");

  const result = synthesizeRecipe(r.ir);
  assert.deepEqual(result.validation_errors, []);
  assert.equal(result.recipe.source?.type, "creator");
  assert.equal(result.recipe.source?.handle, undefined);
  assert.equal(result.recipe.source?.url, "https://janescoffee.com/shaken-espresso/");
  assert.ok(result.recipe.tags.includes("web-find"));
  assert.deepEqual(result.recipe.preparations.map((p) => p.channel), ["cometeer", "nespresso", "instant"]);
  assert.ok(result.recipe.preparations.every((p) => p.provenance === "adapted"));
  assert.equal(result.recipe.image, undefined, "never copy the blog's photo");
});

test("blog page with cold brew: publisher as site, volume -> shots", async () => {
  const { extractRecipePage, synthesizeRecipe } = await load();
  const r = await extractRecipePage("https://www.brewbetter.co/sweet-cream", BLOG_COLD_BREW);
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.ir.source_creator?.name, "Brew Better");
  assert.equal(r.ir.stated_coffee.system, "cold_brew");
  assert.equal(r.ir.stated_coffee.serving_size_ml, 240);
  assert.equal(r.ir.stated_coffee.shots, 2);
  assert.ok(r.ir.generated_slug.startsWith("brew-better-"), r.ir.generated_slug);
  assert.deepEqual(synthesizeRecipe(r.ir).validation_errors, []);
});

test("recipes without a coffee base are rejected", async () => {
  const { extractRecipePage } = await load();
  for (const html of [BLOG_NOT_COFFEE, BLOG_COFFEE_LIQUEUR_ONLY]) {
    const r = await extractRecipePage("https://example.com/r", html);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "NO_RECIPE");
  }
});

test("vendor page: vendor attribution and the vendor channel keeps its capsule", async () => {
  const { extractRecipePage, synthesizeRecipe } = await load();
  const r = await extractRecipePage("https://www.nespresso.com/recipes/us/en/22684NES-x.html", VENDOR);
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.vendor, "nespresso");
  assert.equal(r.ir.generated_slug, "nespresso-vertuo-on-ice-macchiato");
  const result = synthesizeRecipe(r.ir);
  assert.deepEqual(result.validation_errors, []);
  assert.equal(result.recipe.source?.type, "vendor");
  const nes = result.recipe.preparations.find((p) => p.channel === "nespresso")!;
  assert.equal(nes.provenance, "original");
  assert.equal(nes.tested_with, "Melozio capsule");
  assert.ok(nes.ingredients.some((i) => i.secondary_amount === 230));
});

test("page with no recipe card and no Gemini key explains itself", async () => {
  const { extractRecipePage } = await load();
  const r = await extractRecipePage("https://example.com/r", "<html><body>Just a story about coffee.</body></html>");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.message, /GEMINI_API_KEY/);
});

test("SSRF guard blocks private and metadata addresses", async () => {
  const { isPrivateAddress, checkPublicUrl } = await load();
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "151.101.1.1", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
  assert.ok(await checkPublicUrl("http://169.254.169.254/latest/meta-data/"));
  assert.ok(await checkPublicUrl("http://localhost:3000/"));
  assert.ok(await checkPublicUrl("http://[::1]/"));
  assert.ok(await checkPublicUrl("file:///etc/passwd"));
  assert.ok(await checkPublicUrl("https://user:pw@example.com/"));
  assert.ok(await checkPublicUrl("https://example.com:8443/"));
  assert.equal(await checkPublicUrl("https://93.184.215.14/recipe"), null);
});

test("ingredient lines with unicode fractions", async () => {
  const { parseIngredientLine } = await import("../lib/translator/extractor");
  assert.deepEqual(
    [parseIngredientLine("½ tsp cinnamon"), parseIngredientLine("1½ cups milk"), parseIngredientLine("- 3 oz half and half")].map(
      (i) => [i?.amount, i?.unit, i?.item]
    ),
    [
      [0.5, "tsp", "cinnamon"],
      [1.5, "cup", "milk"],
      [3, "oz", "half and half"],
    ]
  );
});
