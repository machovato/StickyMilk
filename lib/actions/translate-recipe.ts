"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { Recipe } from "@/lib/types";
import { asValidatedRecipe, validateRecipeCandidate } from "@/lib/recipe-schema";
import { invalidateRecipeCache, recipeSlugExists } from "@/lib/recipes";
import { ingredientTaxonomyIds } from "@/lib/taxonomy";
import { toRecipeFileContents } from "@/lib/write-recipe";
import { isAdminAuthenticated } from "@/lib/auth";
import { extractRecipeIR } from "@/lib/translator/extractor";
import { synthesizeRecipe } from "@/lib/translator/synthesis";
import type { TranslationResult } from "@/lib/translator/types";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");

export async function translateRecipeAction(payload: {
  url?: string;
  caption?: string;
}): Promise<{
  success: boolean;
  result?: TranslationResult;
  error?: string;
}> {
  try {
    const ir = extractRecipeIR({
      url: payload.url,
      caption: payload.caption,
    });

    const result = synthesizeRecipe(ir);
    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Translation failed";
    return {
      success: false,
      error: message,
    };
  }
}

export async function saveTranslatedRecipeAction(recipeCandidate: Recipe): Promise<{
  success: boolean;
  slug?: string;
  error?: string;
}> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return {
      success: false,
      error: "Unauthorized: Admin authorization required to save to vault.",
    };
  }

  // Force newly ingested recipe status to needs_testing
  const recipeToSave: Recipe = {
    ...recipeCandidate,
    status: "needs_testing",
  };

  const errors = validateRecipeCandidate(recipeToSave, ingredientTaxonomyIds());
  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
    };
  }

  let finalSlug = recipeToSave.slug;
  if (recipeSlugExists(finalSlug)) {
    // If slug already exists, generate a deduplicated candidate
    let counter = 2;
    while (recipeSlugExists(`${finalSlug}-${counter}`)) {
      counter++;
    }
    finalSlug = `${finalSlug}-${counter}`;
    recipeToSave.slug = finalSlug;
  }

  const recipe = asValidatedRecipe(recipeToSave);

  mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(
    path.join(CONTENT_DIR, `${recipe.slug}.json`),
    toRecipeFileContents(recipe),
    "utf-8"
  );

  invalidateRecipeCache();
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.slug}`);
  revalidatePath("/translate");

  return {
    success: true,
    slug: recipe.slug,
  };
}
