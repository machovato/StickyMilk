"use server";

import { unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asValidatedRecipe, validateRecipeCandidate } from "@/lib/recipe-schema";
import { invalidateRecipeCache, recipeSlugExists } from "@/lib/recipes";
import { ingredientTaxonomyIds } from "@/lib/taxonomy";
import { toRecipeFileContents } from "@/lib/write-recipe";
import { isAdminAuthenticated } from "@/lib/auth";
import type { CreateRecipeState } from "@/lib/create-recipe-state";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");

export async function updateRecipeAction(
  originalSlug: string,
  _prevState: CreateRecipeState,
  formData: FormData
): Promise<CreateRecipeState> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return {
      errors: [{ path: "", message: "Unauthorized: Admin authorization key required." }],
    };
  }

  const raw = formData.get("recipe");
  if (typeof raw !== "string") {
    return { errors: [{ path: "", message: "Missing recipe payload." }] };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { errors: [{ path: "", message: "Recipe payload was not valid JSON." }] };
  }

  const errors = validateRecipeCandidate(candidate, ingredientTaxonomyIds());

  const newSlug = (candidate as { slug?: unknown } | null)?.slug;
  if (typeof newSlug === "string" && newSlug.trim() !== "") {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(newSlug)) {
      errors.push({
        path: "slug",
        message: "must be lowercase letters/numbers separated by single hyphens",
      });
    } else if (newSlug !== originalSlug && recipeSlugExists(newSlug)) {
      errors.push({
        path: "slug",
        message: `a recipe with slug "${newSlug}" already exists`,
      });
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const recipe = asValidatedRecipe(candidate);

  // Write the updated recipe
  writeFileSync(
    path.join(CONTENT_DIR, `${recipe.slug}.json`),
    toRecipeFileContents(recipe),
    "utf-8"
  );

  // If the slug changed, remove the old file
  if (recipe.slug !== originalSlug) {
    try {
      unlinkSync(path.join(CONTENT_DIR, `${originalSlug}.json`));
    } catch {
      // Ignore if old file already missing
    }
  }

  invalidateRecipeCache();
  revalidatePath("/");
  revalidatePath(`/recipes/${originalSlug}`);
  revalidatePath(`/recipes/${recipe.slug}`);

  redirect(`/recipes/${recipe.slug}`);
}
