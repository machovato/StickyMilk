// Links vault ingredients that have no item_id to the taxonomy, using the
// same deterministic matcher as the translator. Existing item_ids are never
// changed. Run after adding taxonomy entries or aliases.
//
//   npm run backfill:item-ids            # dry run: prints every proposed link
//   npm run backfill:item-ids -- --apply # writes content/recipes/*.json

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { matchTaxonomy } from "../lib/translator/taxonomy-match";
import type { IngredientTaxonomyEntry } from "../lib/taxonomy";
import { convertAmount } from "../lib/nutrition";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const taxonomy: IngredientTaxonomyEntry[] = JSON.parse(
  readFileSync(path.join(root, "content", "taxonomy", "ingredients.json"), "utf-8")
);
const dir = path.join(root, "content", "recipes");

let links = 0;
let files = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(dir, file);
  const raw = readFileSync(filePath, "utf-8");
  const recipe = JSON.parse(raw);
  let changed = false;
  for (const prep of recipe.preparations ?? []) {
    for (const ing of prep.ingredients ?? []) {
      if (ing.item_id) continue;
      const m = matchTaxonomy(ing.item, taxonomy);
      if (!m.id) continue;
      const entry = taxonomy.find((e) => e.id === m.id);
      if (entry?.nutrition && convertAmount(ing.amount ?? 1, ing.unit, entry.nutrition.per.unit) === null) {
        continue;
      }
      console.log(`${file} [${prep.channel}]  "${ing.item}"  ->  ${m.id}`);
      // Keep the vault's key order: item_id right after item
      const ordered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(ing)) {
        ordered[k] = v;
        if (k === "item") ordered.item_id = m.id;
      }
      Object.keys(ing).forEach((k) => delete ing[k]);
      Object.assign(ing, ordered);
      changed = true;
      links++;
    }
  }
  if (changed && apply) {
    // Same 2-space format the vault uses; key order is preserved by JSON.parse
    writeFileSync(filePath, JSON.stringify(recipe, null, 2) + "\n", "utf-8");
    files++;
  }
}
console.log(apply ? `\nLinked ${links} ingredients in ${files} files.` : `\n${links} links proposed. Re-run with --apply to write.`);
