import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Recipe } from "./types";
import { asValidatedRecipe, validateRecipeCandidate } from "./recipe-schema";
import { ingredientTaxonomyIds } from "./taxonomy";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");

let cache: Recipe[] | null = null;

/**
 * Fails loudly and specifically at load time rather than letting a
 * malformed recipe file crash deep inside a component with a cryptic
 * "Cannot read properties of undefined" error. Recipe JSON is hand-edited
 * (and now also form-edited) content, so bad files are expected
 * occasionally — name the file and the problem.
 *
 * Structural rules live in `recipe-schema.ts` (shared with the New Recipe
 * form's Server Action, which enforces the same rules on write). This
 * function adds the one check that's specific to reading from disk: the
 * `slug` field has to match the filename it's found in.
 */
function validate(candidate: unknown, file: string): asserts candidate is Recipe {
  const errors = validateRecipeCandidate(candidate, ingredientTaxonomyIds());

  const slug = (candidate as { slug?: unknown } | null)?.slug;
  if (typeof slug === "string" && slug !== file.replace(/\.json$/, "")) {
    errors.push({ path: "slug", message: `"${slug}" doesn't match filename` });
  }

  if (errors.length > 0) {
    const bullets = errors.map((e) => (e.path ? `\`${e.path}\`: ${e.message}` : e.message));
    throw new Error(`content/recipes/${file} is invalid:\n  - ${bullets.join("\n  - ")}`);
  }
}

/**
 * Recipe content is curated editorial JSON, not database rows — read
 * straight off disk. Cached per server process. The New Recipe form calls
 * `invalidateRecipeCache()` right after a successful write so a newly
 * created recipe shows up without a dev-server restart; if you hand-edit a
 * file directly, restart `next dev` (nothing watches `content/` for you).
 */
export function getAllRecipes(): Recipe[] {
  if (process.env.NODE_ENV !== "development" && cache) return cache;

  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));
  const recipes = files.map((file) => {
    const raw = readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const candidate: unknown = JSON.parse(raw);
    validate(candidate, file);
    return asValidatedRecipe(candidate);
  });

  recipes.sort((a, b) => a.name.localeCompare(b.name));
  cache = recipes;
  return recipes;
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return getAllRecipes().find((r) => r.slug === slug);
}

/** Clears the in-process recipe cache. Call after writing a new recipe file. */
export function invalidateRecipeCache(): void {
  cache = null;
}

/**
 * Authoritative existence check for the New Recipe form's slug-collision
 * guard — reads the directory fresh rather than trusting `cache`, since a
 * write earlier in the same request lifecycle wouldn't otherwise be
 * reflected yet.
 */
export function recipeSlugExists(slug: string): boolean {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));
  return files.includes(`${slug}.json`);
}

export function creatorSlugFromHandle(handleOrName: string): string {
  return handleOrName
    .replace(/^@/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-");
}

export interface CreatorProfile {
  slug: string;
  name: string;
  handle?: string;
  platform?: string;
  url?: string;
  avatar?: string;
  recipes: Recipe[];
}

export function getAllCreators(): CreatorProfile[] {
  const recipes = getAllRecipes();
  const map = new Map<string, CreatorProfile>();

  for (const r of recipes) {
    if (r.source && r.source.type === "creator") {
      const key = r.source.handle || r.source.name;
      const slug = creatorSlugFromHandle(key);
      const existing = map.get(slug);
      if (existing) {
        existing.recipes.push(r);
        if (!existing.avatar && r.source.avatar) existing.avatar = r.source.avatar;
        if (!existing.url && r.source.url) existing.url = r.source.url;
      } else {
        map.set(slug, {
          slug,
          name: r.source.name,
          handle: r.source.handle,
          platform: r.source.platform,
          url: r.source.url,
          avatar: r.source.avatar,
          recipes: [r],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.recipes.length - a.recipes.length);
}

export function getCreatorBySlug(slug: string): CreatorProfile | undefined {
  const normalized = creatorSlugFromHandle(slug);
  return getAllCreators().find((c) => c.slug === normalized);
}

export function getAllTags(): { tag: string; count: number }[] {
  const recipes = getAllRecipes();
  const counts = new Map<string, number>();

  for (const r of recipes) {
    for (const t of r.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getRecipesByTag(tag: string): Recipe[] {
  const normalized = tag.toLowerCase().trim();
  return getAllRecipes().filter((r) =>
    r.tags.some((t) => t.toLowerCase().trim() === normalized)
  );
}

