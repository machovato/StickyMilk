"use server";

import { mkdirSync, writeFileSync } from "node:fs";
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

/**
 * Writes a new file to `content/recipes/`. Gated by admin authentication.
 *
 * The incoming `recipe` field is one serialized JSON blob built client-side
 * from the form's draft state. That makes it untrusted input as far as
 * this function is concerned — it's parsed defensively, re-validated
 * against the same canonical schema the content reader uses
 * (`recipe-schema.ts`), and the slug is re-checked against the filesystem
 * here (not trusted from any client-side "is this slug free?" check),
 * immediately before writing.
 */
export async function createRecipeAction(
  _prevState: CreateRecipeState,
  formData: FormData
): Promise<CreateRecipeState> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return { errors: [{ path: "", message: "Unauthorized: Admin authorization key required." }] };
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

  // Fresh read (not trusted from any client-side taxonomy snapshot) —
  // mirrors the slug re-check below: any `item_id` the client submitted
  // gets re-verified against the real taxonomy immediately before writing.
  const errors = validateRecipeCandidate(candidate, ingredientTaxonomyIds());

  // Slug format + collision: writer-specific concerns the shared schema
  // doesn't know about (it has no idea a filesystem exists).
  const slug = (candidate as { slug?: unknown } | null)?.slug;
  if (typeof slug === "string" && slug.trim() !== "") {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      errors.push({
        path: "slug",
        message: "must be lowercase letters, numbers, and single dashes only",
      });
    } else if (recipeSlugExists(slug)) {
      errors.push({
        path: "slug",
        message: `a recipe already exists at content/recipes/${slug}.json — this form only creates new recipes`,
      });
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const recipe = asValidatedRecipe(candidate);

  mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(
    path.join(CONTENT_DIR, `${recipe.slug}.json`),
    toRecipeFileContents(recipe),
    "utf-8"
  );

  // Two independent caches to clear: `lib/recipes.ts`'s own in-memory
  // array (a plain module variable — revalidatePath doesn't touch it) and
  // Next's route cache for the pages that read recipes.
  invalidateRecipeCache();
  revalidatePath("/");
  revalidatePath(`/recipes/${recipe.slug}`);

  redirect(`/recipes/${recipe.slug}`);
}
