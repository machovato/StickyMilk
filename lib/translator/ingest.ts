import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { asValidatedRecipe, validateRecipeCandidate, type FieldError } from "@/lib/recipe-schema";
import { invalidateRecipeCache, recipeSlugExists } from "@/lib/recipes";
import { ingredientTaxonomyIds } from "@/lib/taxonomy";
import { toRecipeFileContents } from "@/lib/write-recipe";
import type { RecipeIR, TranslationResult } from "./types";

/**
 * Writes a translated recipe (and its hero image) into the Git-backed vault.
 * Shared by the admin translate action and scripts/import-vendor.ts. No
 * Next.js APIs in here — callers revalidate paths themselves.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");
const IMAGE_DIR = path.join(process.cwd(), "public", "recipes");

export function uniqueSlug(slug: string): string {
  if (!recipeSlugExists(slug)) return slug;
  let counter = 2;
  while (recipeSlugExists(`${slug}-${counter}`)) counter++;
  return `${slug}-${counter}`;
}

/** Saves the smart hero frame (preferred) or the platform thumbnail. Returns the public path. */
export async function saveHeroImage(slug: string, ir: RecipeIR): Promise<string | undefined> {
  const fileName = `${slug}.jpg`;
  const imagePath = path.join(IMAGE_DIR, fileName);
  try {
    if (ir.hero_frame_base64) {
      mkdirSync(IMAGE_DIR, { recursive: true });
      writeFileSync(imagePath, Buffer.from(ir.hero_frame_base64, "base64"));
      console.log(`[Ingest] Saved smart hero thumbnail: /recipes/${fileName} (${ir.hero_frame_reason || "selected hero frame"})`);
      return `/recipes/${fileName}`;
    }
    if (ir.thumbnail_url) {
      const res = await fetch(ir.thumbnail_url);
      if (res.ok) {
        mkdirSync(IMAGE_DIR, { recursive: true });
        writeFileSync(imagePath, Buffer.from(await res.arrayBuffer()));
        console.log(`[Ingest] Saved video thumbnail: /recipes/${fileName}`);
        return `/recipes/${fileName}`;
      }
    }
  } catch (err) {
    console.warn("[Ingest] Failed to save hero image:", err);
  }
  return undefined;
}

/**
 * Assigns a unique slug, saves the hero image, and writes the recipe JSON as
 * needs_testing. Mutates result.recipe (slug, image, status) so the caller's
 * preview matches what was written.
 */
export async function ingestTranslation(
  result: TranslationResult
): Promise<{ written: boolean; slug: string; errors: FieldError[] }> {
  const slug = uniqueSlug(result.recipe.slug);
  result.recipe.slug = slug;

  const image = await saveHeroImage(slug, result.ir);
  if (image) result.recipe.image = image;

  result.recipe.status = "needs_testing";
  result.recipe.review = undefined;
  result.recipe.created_at = new Date().toISOString();

  const errors = validateRecipeCandidate(result.recipe, ingredientTaxonomyIds());
  if (errors.length > 0) {
    console.warn(`[Ingest] Validation errors, skipped write for ${slug}:`, errors);
    return { written: false, slug, errors };
  }

  mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(
    path.join(CONTENT_DIR, `${slug}.json`),
    toRecipeFileContents(asValidatedRecipe(result.recipe)),
    "utf-8"
  );
  invalidateRecipeCache();
  console.log(`[Ingest] Wrote content/recipes/${slug}.json`);
  return { written: true, slug, errors: [] };
}
