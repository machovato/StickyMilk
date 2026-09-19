// One-time conversion of the two raw AI-generated recipe batches (Cometeer-only,
// flat fields) into the StickyMilk Recipe/Preparation content schema.
//
// Run with: node scripts/convert-seed.mjs
// Writes one JSON file per recipe into content/recipes/.
//
// IMPORTANT: source batches are unverified test data. Every recipe is seeded
// with status "draft". See SEED_NOTES.md for data-quality caveats.
//
// STALE: content/recipes/ has since been hand-edited past this script's
// output — duplicates consolidated, the tiramisu bug fixed, tags/
// sweetness_level added, Nespresso/instant preps added to two recipes.
// Re-running this file will blow those changes away. It's kept only as a
// record of where the original 16 came from; see SEED_NOTES.md for the
// full history.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "content", "recipes");
mkdirSync(OUT_DIR, { recursive: true });

function slugify(name) {
  return name
    .replace(/đ/gi, "d") // Đ/đ isn't a combining diacritic, NFD won't strip it
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining combining diacritics (Sữa -> Sua)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Batch 1 — "Cometeer Recipe Menu" machine-readable block (8 recipes)
// ---------------------------------------------------------------------------
const batch1 = [
  {
    name: "Cà Phê Sữa Đá",
    format: "iced",
    roast: "Equator Mocha Java",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 full-caf capsule = 26 g extract, ~180 mg caffeine",
      "1 Cometeer capsule, melted",
      "3 oz / 90 ml hot water",
      "2 tbsp sweetened condensed milk",
      "1 cup ice",
    ],
    steps: [
      "Stir the hot water into the melted capsule.",
      "Stir in the condensed milk until smooth.",
      "Fill a glass with ice.",
      "Pour the coffee mixture over the ice and stir.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "Vietnamese-style iced coffee — condensed-milk sweetness against dark, bold coffee, without the long phin drip.",
  },
  {
    name: "Vanilla Oat Cometeer Latte",
    format: "hot",
    roast: "Intelligentsia French Roast",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 full-caf capsule = 26 g extract, ~180 mg caffeine",
      "1 Cometeer capsule, melted",
      "6 oz oat milk",
      "1 tbsp vanilla syrup",
      "Pinch of cinnamon",
    ],
    steps: [
      "Warm the oat milk until steaming but not boiling.",
      "Stir in the vanilla syrup.",
      "Pour the melted coffee into a mug.",
      "Add the hot oat milk and finish with cinnamon.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "A café-style latte built on vanilla and cinnamon warmth with oat milk, no espresso machine needed.",
  },
  {
    name: "Grapefruit Coffee Tonic",
    format: "mocktail",
    roast: "Go Get Em Tiger Chelbesa",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 full-caf capsule = 26 g extract, ~180 mg caffeine",
      "1 Cometeer capsule, melted",
      "20 g boiling water",
      "4 oz chilled tonic water",
      "1 oz grapefruit juice",
      "Ice",
      "Grapefruit wedge",
    ],
    steps: [
      "Stir the boiling water into the melted capsule.",
      "Fill a tall glass with ice.",
      "Add the grapefruit juice and tonic.",
      "Slowly pour the coffee over the top.",
      "Garnish with grapefruit.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "Bitter-bright espresso-tonic energy, with a fruity coffee doing the work instead of pulled espresso.",
  },
  {
    name: "Frozen Coffee Martini",
    format: "cocktail",
    roast: "Intelligentsia Decaf Black Cat Espresso",
    difficulty: "medium",
    caffeine_level: "decaf",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 decaf capsule = 26 g extract, ~9 mg caffeine",
      "1 Cometeer Decaf Black Cat Espresso capsule, melted",
      "20 g boiling water",
      "2 oz vodka",
      "1 oz coffee liqueur",
      "1/2 oz simple syrup",
      "1 cup ice",
    ],
    steps: [
      "Stir the hot water into the melted coffee.",
      "Let it cool for a few minutes.",
      "Add the coffee, vodka, coffee liqueur, syrup, and ice to a jar or shaker.",
      "Shake hard until very cold and slightly frothy.",
      "Strain into a chilled cocktail glass.",
    ],
    prep_time_minutes: 8,
    flavor_notes:
      "A frozen, dessert-like riff on an espresso martini — cold, boozy, and coffee-forward.",
  },
  {
    name: "Black Cat Affogato",
    format: "affogato",
    roast: "Intelligentsia Decaf Black Cat Espresso",
    difficulty: "easy",
    caffeine_level: "decaf",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 decaf capsule = 26 g extract, ~9 mg caffeine",
      "1 Cometeer Decaf Black Cat Espresso capsule, melted",
      "20 g boiling water",
      "2 scoops vanilla gelato or ice cream",
      "Optional: shaved dark chocolate",
    ],
    steps: [
      "Stir the boiling water into the melted coffee.",
      "Place the gelato in a small serving bowl or glass.",
      "Pour the hot coffee over the gelato.",
      "Add dark chocolate, if using.",
      "Serve immediately.",
    ],
    prep_time_minutes: 4,
    flavor_notes:
      "Classic affogato character — intensely flavored hot coffee poured fast over cold vanilla gelato.",
  },
  {
    name: "Four-Serving Cometeer Tiramisu",
    format: "baking",
    roast: "Equator Mocha Java",
    difficulty: "medium",
    caffeine_level: "decaf",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 decaf capsule = 26 g extract, ~9 mg caffeine",
      "1 Cometeer Decaf Black Cat Espresso capsule, melted",
      "2 oz / 60 g hot water",
      "1 tbsp sugar",
      "12 small ladyfingers",
      "8 oz mascarpone",
      "1/2 cup heavy cream",
      "3 tbsp powdered sugar",
      "1/2 tsp vanilla",
      "Unsweetened cocoa powder",
    ],
    steps: [
      "Stir the melted coffee, hot water, and sugar together; cool.",
      "Whip the cream, powdered sugar, and vanilla until softly firm.",
      "Fold the whipped cream into the mascarpone.",
      "Dip each ladyfinger briefly into the coffee mixture.",
      "Layer the soaked ladyfingers with the mascarpone mixture.",
      "Chill until set.",
      "Dust with cocoa before serving.",
    ],
    prep_time_minutes: 30,
    flavor_notes:
      "Classic tiramisu flavor — coffee-soaked ladyfingers layered with sweet mascarpone cream and cocoa.",
    // KNOWN SOURCE BUG — see SEED_NOTES.md. Do not silently resolve.
    data_issues: [
      'roast ("Equator Mocha Java", a full-caf roast) contradicts ingredients/caffeine_level ' +
        '("1 Cometeer Decaf Black Cat Espresso capsule, melted", caffeine_level: "decaf"). ' +
        "Source batch did not say which is correct. Left both fields as given from source " +
        "rather than guessing; needs human verification before this recipe leaves draft status.",
    ],
  },
  {
    name: "Maple Coffee Cream Soda",
    format: "iced",
    roast: "Proud Mary Humbler",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 full-caf capsule = 26 g extract, ~180 mg caffeine",
      "1 Cometeer capsule, melted and chilled",
      "4 oz sparkling water",
      "1 tbsp maple syrup",
      "1 oz half-and-half",
      "Ice",
      "Pinch of salt",
    ],
    steps: [
      "Stir the maple syrup and pinch of salt into the chilled coffee.",
      "Fill a glass with ice.",
      "Add the sparkling water.",
      "Pour in the coffee.",
      "Top with half-and-half and stir once.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "A pantry-simple coffee soda — maple sweetness, a fizzy lift, and a touch of cream.",
  },
  {
    name: "Salted Mocha Cometeer Shake",
    format: "iced",
    roast: "Onyx Southern Weather",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "Coffee math: 1 full-caf capsule = 26 g extract, ~180 mg caffeine",
      "1 frozen Cometeer capsule",
      "6 oz milk",
      "2 scoops vanilla ice cream",
      "1 tbsp chocolate syrup",
      "Pinch of flaky salt",
    ],
    steps: [
      "Add the frozen coffee puck, milk, ice cream, chocolate syrup, and salt to a blender.",
      "Blend until smooth.",
      "Pour into a chilled glass.",
      "Add a tiny pinch of flaky salt on top.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "A frozen mocha milkshake — chocolate, vanilla, and a pinch of salt to round out the coffee.",
  },
];

// ---------------------------------------------------------------------------
// Batch 2 — second machine-readable block (8 recipes). No editorial
// description text was included in this batch, so flavor_notes below are
// restatements of the given ingredients/name only (see SEED_NOTES.md).
// ---------------------------------------------------------------------------
const batch2 = [
  {
    name: "Cà Phê Sữa Nóng (Phin-Style, No Phin)",
    format: "hot",
    roast: "Intelligentsia French Roast",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule (26 g frozen extract, ~180 mg caffeine — replaces a phin loaded with ~18–20 g dark roast, not an espresso shot)",
      "3 oz just-off-boil water",
      "2 tbsp sweetened condensed milk",
    ],
    steps: [
      "Spoon the condensed milk into a heatproof glass.",
      "Drop in the frozen puck and pour 3 oz hot water over it (about 90 ml — phin yield, not the usual 6–8 oz cup).",
      "Stir until the puck melts and the drink turns caramel-brown.",
      "Taste; add 1 tsp more condensed milk if you want street-cart sweetness.",
    ],
    prep_time_minutes: 4,
    flavor_notes:
      "Hot Vietnamese-style coffee — condensed milk stirred into strong, dark coffee, served warm.",
  },
  {
    name: "Cà Phê Sữa Đá (Vietnamese Iced Coffee)",
    format: "iced",
    roast: "Intelligentsia French Roast",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule (26 g extract, ~180 mg caffeine; swap for instant G7 or a phin brew)",
      "3 oz just-off-boil water",
      "2 tbsp sweetened condensed milk",
      "Ice",
    ],
    steps: [
      "Add condensed milk to a heatproof glass.",
      "Melt the puck in 3 oz hot water in that glass and stir until uniform.",
      "Fill a tall glass with ice and pour the hot coffee-milk mix over it.",
      "Stir once; do not add a second full-caf capsule unless you want ~360 mg caffeine.",
    ],
    prep_time_minutes: 5,
    flavor_notes: "Vietnamese iced coffee — condensed milk and bold coffee over ice.",
  },
  {
    name: "Layered Coffee Tonic",
    format: "mocktail",
    roast: "Go Get Em Tiger Chelbesa",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule, fully melted and cooled (26 g / ~0.88 oz, ~180 mg caffeine — stands in for a 1 oz espresso, not a Vertuo 2.7 oz double)",
      "4 oz chilled tonic water",
      "Ice",
      "Lemon peel",
    ],
    steps: [
      "Melt the capsule ahead of time; keep it cold.",
      "Fill a tall glass with ice and pour in the tonic.",
      "Slowly pour the melted coffee over the back of a spoon so it layers on top.",
      "Garnish with lemon peel; stir only if you want it mixed.",
    ],
    prep_time_minutes: 6,
    flavor_notes:
      "A layered coffee tonic — bittersweet coffee poured over chilled tonic water with a lemon note.",
  },
  {
    name: "Frozen Espresso Martini (Two-Puck)",
    format: "cocktail",
    roast: "Black & White The Classic Half Caff",
    difficulty: "medium",
    caffeine_level: "half",
    capsule_count: 2,
    ingredients: [
      "2 Cometeer capsules, still frozen (52 g extract / ~1.76 oz; two half-caf pucks ≈ 180 mg caffeine, not 360)",
      "2 oz vodka",
      "2 oz coffee liqueur",
      "0.5 oz simple syrup",
      "2.5 cups ice",
      "Pinch of salt",
    ],
    steps: [
      "Run the sealed capsules under water just long enough to pop the pucks out frozen.",
      "Blend frozen pucks, vodka, coffee liqueur, simple syrup, salt, and ice until thick.",
      "Split between 2 glasses (about 90 mg caffeine each).",
      "Do not swap in two full-caf capsules for this blender volume.",
    ],
    prep_time_minutes: 8,
    flavor_notes:
      "A frozen espresso martini for two — vodka, coffee liqueur, and blended ice.",
  },
  {
    name: "Weeknight Vanilla Affogato",
    format: "affogato",
    roast: "Intelligentsia Decaf Black Cat Espresso",
    difficulty: "easy",
    caffeine_level: "decaf",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule, fully melted (26 g; decaf ≈ 9 mg caffeine — a full-caf puck would be ~180 mg over dessert)",
      "1 large scoop vanilla ice cream",
    ],
    steps: [
      "Melt the capsule completely; a frozen puck will not coat the ice cream.",
      "Put the ice cream in a small bowl.",
      "Pour the melted extract over the scoop and serve immediately.",
      "If you want more coverage without more caffeine, add 1 tsp hot water to the melted puck, not a second full-caf capsule.",
    ],
    prep_time_minutes: 6,
    flavor_notes: "A simple affogato — melted coffee poured over vanilla ice cream.",
  },
  {
    name: "No-Bake Tiramisu Cups",
    format: "baking",
    roast: "Intelligentsia Black Cat Classic Espresso",
    difficulty: "medium",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule, fully melted (26 g, ~180 mg caffeine total / ~45 mg per cup if split 4 ways; replaces instant espresso powder or a small espresso soak)",
      "2 oz water",
      "1 tbsp sugar",
      "8–12 ladyfingers or graham crackers",
      "1 cup heavy cream",
      "4 oz mascarpone or cream cheese, softened",
      "2 tbsp powdered sugar",
      "1/2 tsp vanilla extract",
      "Cocoa powder",
    ],
    steps: [
      "Stir melted capsule with water and sugar; this soak is stronger than drip coffee, so dip fast.",
      "Whip cream, mascarpone, powdered sugar, and vanilla until thick.",
      "Dip ladyfingers 1–2 seconds only, then layer with cream in 4 cups.",
      "Chill 20 minutes and dust with cocoa.",
    ],
    prep_time_minutes: 25,
    flavor_notes:
      "Individual no-bake tiramisu cups — coffee-soaked ladyfingers layered with sweetened mascarpone cream.",
  },
  {
    name: "Coffee Dirty Soda",
    format: "mocktail",
    roast: "Onyx Southern Weather",
    difficulty: "easy",
    caffeine_level: "full",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule, fully melted and chilled (26 g, ~180 mg caffeine — the coffee swap for viral dirty soda that uses only creamer)",
      "8 oz cola or lemon-lime soda",
      "2 tbsp sweet cream or half-and-half",
      "1 tsp vanilla syrup or honey",
      "Ice",
      "Lime wedge",
    ],
    steps: [
      "Melt and chill the capsule.",
      "Fill a tall glass with ice, soda, vanilla, and cream.",
      "Pour in the melted coffee and stir once.",
      "Finish with lime; skip a second capsule — the soda is the volume, the puck is the coffee.",
    ],
    prep_time_minutes: 5,
    flavor_notes:
      "A coffee dirty soda — cola or lemon-lime soda with sweet cream and a coffee pour.",
  },
  {
    name: "One-Bowl Mocha Skillet Cookie",
    format: "baking",
    roast: "Equator Mocha Java",
    difficulty: "easy",
    caffeine_level: "half",
    capsule_count: 1,
    ingredients: [
      "1 Cometeer capsule, fully melted — use Birch Coffee Half Day Dark Half Caff if you want the labeled ~90 mg in the whole skillet (full-caf Equator is ~180 mg)",
      "4 tbsp butter, melted",
      "1/3 cup brown sugar",
      "1 egg yolk",
      "1/2 tsp vanilla extract",
      "1/2 cup all-purpose flour",
      "2 tbsp cocoa powder",
      "1/4 tsp baking soda",
      "Pinch of salt",
      "1/3 cup chocolate chips",
    ],
    steps: [
      "Heat oven to 350°F. Melt the capsule so you add liquid extract, not a frozen puck.",
      "Stir butter, brown sugar, egg yolk, vanilla, and melted coffee until smooth.",
      "Fold in flour, cocoa, baking soda, salt, and chocolate chips.",
      "Spread in a small oven-safe skillet and bake 12–14 minutes, until the edges set.",
    ],
    prep_time_minutes: 25,
    flavor_notes:
      "A one-bowl mocha skillet cookie — chocolate and coffee baked into a warm, gooey dessert.",
  },
];

function toRecipe(raw) {
  const { name, format, flavor_notes, data_issues, ...prepFields } = raw;
  const preparation = {
    channel: "cometeer",
    roast: prepFields.roast,
    capsule_count: prepFields.capsule_count,
    caffeine_level: prepFields.caffeine_level,
    ingredients: prepFields.ingredients,
    steps: prepFields.steps,
    difficulty: prepFields.difficulty,
    prep_time_minutes: prepFields.prep_time_minutes,
  };
  const recipe = {
    slug: slugify(name),
    name,
    format,
    flavor_notes,
    status: "draft",
    preparations: [preparation],
    // Nespresso/instant intentionally omitted — not present in source data.
    // Do not fabricate; UI should show "not yet available" for these channels.
  };
  if (data_issues) recipe.data_issues = data_issues;
  return recipe;
}

const all = [...batch1, ...batch2].map(toRecipe);

const slugs = new Set();
for (const r of all) {
  if (slugs.has(r.slug)) {
    throw new Error(`Duplicate slug generated: ${r.slug}`);
  }
  slugs.add(r.slug);
  writeFileSync(
    path.join(OUT_DIR, `${r.slug}.json`),
    JSON.stringify(r, null, 2) + "\n",
    "utf-8"
  );
}

console.log(`Wrote ${all.length} recipe files to ${OUT_DIR}`);
