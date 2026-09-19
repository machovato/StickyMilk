// One-time backfill of `tags` and `sweetness_level` onto recipes that
// predate those fields (everything except the 3 files already hand-edited
// with them: ca-phe-sua-da, vanilla-oat-latte, four-serving-cometeer-tiramisu).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "recipes");

const metadata = {
  "black-cat-affogato": {
    tags: ["after-dinner", "dessert", "quick-fix"],
    sweetness_level: "dessert",
  },
  "ca-phe-sua-nong-phin-style-no-phin": {
    tags: ["cozy", "quick-fix", "vietnamese-style"],
    sweetness_level: "rich_sweet",
  },
  "coffee-dirty-soda": {
    tags: ["summer", "trendy", "quick-fix"],
    sweetness_level: "rich_sweet",
  },
  "frozen-coffee-martini": {
    tags: ["cocktail-hour", "date-night", "after-dinner"],
    sweetness_level: "subtle",
  },
  "frozen-espresso-martini-two-puck": {
    tags: ["cocktail-hour", "date-night", "serves-two"],
    sweetness_level: "subtle",
  },
  "grapefruit-coffee-tonic": {
    tags: ["summer", "afternoon-pick-me-up", "low-effort"],
    sweetness_level: "subtle",
  },
  "layered-coffee-tonic": {
    tags: ["summer", "afternoon-pick-me-up", "low-effort"],
    sweetness_level: "none",
  },
  "maple-coffee-cream-soda": {
    tags: ["summer", "kid-friendly", "quick-fix"],
    sweetness_level: "rich_sweet",
  },
  "no-bake-tiramisu-cups": {
    tags: ["make-ahead", "individual-servings", "dessert"],
    sweetness_level: "dessert",
  },
  "one-bowl-mocha-skillet-cookie": {
    tags: ["baking", "dessert", "shareable"],
    sweetness_level: "dessert",
  },
  "salted-mocha-cometeer-shake": {
    tags: ["summer", "dessert", "quick-fix"],
    sweetness_level: "dessert",
  },
};

for (const [slug, fields] of Object.entries(metadata)) {
  const file = path.join(DIR, `${slug}.json`);
  const recipe = JSON.parse(readFileSync(file, "utf-8"));
  if (recipe.tags || recipe.sweetness_level) {
    console.log(`skip ${slug} — already has metadata`);
    continue;
  }
  // Insert tags/sweetness_level right after `status`, before `preparations`,
  // to match the ordering used on the hand-edited files.
  const { slug: s, name, format, flavor_notes, status, preparations, ...rest } = recipe;
  const next = {
    slug: s,
    name,
    format,
    flavor_notes,
    status,
    tags: fields.tags,
    sweetness_level: fields.sweetness_level,
    preparations,
    ...rest,
  };
  writeFileSync(file, JSON.stringify(next, null, 2) + "\n", "utf-8");
  console.log(`updated ${slug}`);
}
