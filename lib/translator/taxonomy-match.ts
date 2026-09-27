import type { IngredientTaxonomyEntry } from "../taxonomy";

export interface TaxonomyMatchResult {
  id?: string;
  name?: string;
  is_novel: boolean;
}

/**
 * Maps a free-text ingredient ("cold whole milk", "flaky sea salt") to a
 * taxonomy entry. Pure — takes the taxonomy as an argument so it can be
 * unit-tested without the filesystem (see scripts/test-taxonomy-match.ts).
 *
 * The match feeds nutrition, so a wrong match is worse than no match: an
 * unmatched item is flagged as novel for review, a wrong one silently
 * reports the wrong calories. Hence the tiers, most to least certain:
 *
 *   1. Exact id / name / alias.
 *   2. A name or alias that ENDS the item, whole words, longest wins.
 *      English puts the head noun last, so "iced cinnamon dolce syrup" is a
 *      syrup, not ice, and "salted caramel sauce" is caramel sauce.
 *   3. Known multi-word phrases anywhere ("maple syrup drizzle").
 *   4. Head-noun fallbacks for common generic items ("sea salt", "2% milk").
 *
 * Plain substring matching (the old approach) is deliberately gone: "ice"
 * is inside "spice", "juice", and "iced", and "milk" is inside "oat milk" and
 * "milk chocolate".
 */
export function matchTaxonomy(
  item: string,
  taxonomy: IngredientTaxonomyEntry[]
): TaxonomyMatchResult {
  const full = normalize(item);
  // Drop prep qualifiers ("brown sugar, packed", "vanilla syrup (homemade)")
  // and alternatives ("sugar or honey" -> the first option is what's measured).
  const core = normalize(full.split(/[,(]/)[0].split(/\s+or\s+/)[0]);
  if (!core) return { is_novel: true };

  const hit = (entry: IngredientTaxonomyEntry | undefined): TaxonomyMatchResult | null =>
    entry ? { id: entry.id, name: entry.name, is_novel: false } : null;
  const byId = (id: string) => hit(taxonomy.find((e) => e.id === id));

  // 1. Exact id / name / alias
  for (const text of [full, core]) {
    const exact = taxonomy.find(
      (e) =>
        e.id.toLowerCase() === text ||
        normalize(e.name) === text ||
        e.aliases.some((a) => normalize(a) === text)
    );
    if (exact) return hit(exact)!;
  }

  // 2. Longest name/alias that ends the item on a word boundary
  let best: { entry: IngredientTaxonomyEntry; length: number } | null = null;
  for (const entry of taxonomy) {
    for (const phrase of [entry.name, ...entry.aliases].map(normalize)) {
      if (!phrase || phrase.length <= (best?.length ?? 0)) continue;
      if (core === phrase || core.endsWith(` ${phrase}`)) {
        best = { entry, length: phrase.length };
      }
    }
  }
  if (best) return hit(best.entry)!;

  // A flavored creamer is its own product, not the flavor it's named after
  // ("Chobani Cookie Butter creamer" is not cookie butter).
  if (/\bcreamer$/.test(core)) return { is_novel: true };

  // 3. Specific multi-word phrases anywhere in the item
  const PHRASES: Array<[RegExp, string]> = [
    [/\b(cookie butter|biscoff spread|speculoos)\b/, "cookie_butter"],
    [/\b(protein shake|fairlife)\b/, "vanilla_protein_shake"],
    [/\boat milk\b/, "oat_milk"],
    [/\b(salted )?caramel syrup\b/, "salted_caramel_syrup"],
    [/\bcaramel (sauce|drizzle)\b/, "caramel_sauce"],
    [/\bvanilla syrup\b/, "vanilla_syrup"],
    [/\bmaple syrup\b/, "maple_syrup"],
    [/\bbrown sugar\b/, "brown_sugar"],
    [/\bheavy (whipping )?cream\b/, "heavy_cream"],
    [/\bmascarpone\b/, "mascarpone"],
  ];
  for (const [pattern, id] of PHRASES) {
    if (pattern.test(core)) {
      const m = byId(id);
      if (m) return m;
    }
  }

  // 4. Head-noun fallbacks (last word(s) of the item)
  if (/\bice( cubes?)?$/.test(core)) return byId("ice") ?? { is_novel: true };
  if (/\bmilk$/.test(core) && !/\b(condensed|evaporated|coconut|almond|soy|oat)\b/.test(core)) {
    return byId("milk") ?? { is_novel: true };
  }
  if (/\bcream$/.test(core) && !/\b(ice|coconut|sour|cheese)\b/.test(core)) {
    return byId("heavy_cream") ?? { is_novel: true };
  }
  if (/\bsalt$/.test(core)) {
    return byId("flaky_salt") ?? byId("pinch_of_salt") ?? { is_novel: true };
  }
  if (/\bcinnamon$/.test(core)) return byId("ground_cinnamon") ?? { is_novel: true };

  return { is_novel: true };
}

function normalize(s: string): string {
  // Hyphens as spaces: "half and half" should find "Half-and-half"
  return s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}
