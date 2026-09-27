"use server";

import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRecipeBySlug, invalidateRecipeCache } from "@/lib/recipes";
import { asValidatedRecipe } from "@/lib/recipe-schema";
import { toRecipeFileContents } from "@/lib/write-recipe";
import { buildPhotoPlan } from "@/lib/photo/prompt";
import { generatePhoto } from "@/lib/photo/generate";
import { generatePhotoBrief } from "@/lib/photo/brief";
import type { PhotoBrief, Recipe } from "@/lib/types";

/**
 * Admin photo studio actions for the recipe edit page.
 *
 * generate: renders a few candidates (each with its own background staging)
 *           and returns them for preview. Nothing is saved.
 * save:     writes the chosen candidate to public/recipes/ and points the
 *           recipe at it, marked image_source: "ai".
 * brief:    (re)writes the art-director brief saved on the recipe.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");
const IMAGE_DIR = path.join(process.cwd(), "public", "recipes");

export interface PhotoCandidate {
  jpegBase64: string;
  model: string;
  /** What this render was asked for, shown in the studio so the style can be tuned */
  prompt: string;
  staging: string[];
  moment: string | null;
}

/** Writes a recipe back to the vault and refreshes the pages that show it. */
function writeRecipe(recipe: Recipe): Recipe {
  const validated = asValidatedRecipe(recipe);
  writeFileSync(path.join(CONTENT_DIR, `${recipe.slug}.json`), toRecipeFileContents(validated), "utf-8");
  invalidateRecipeCache();
  try {
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipe.slug}`);
  } catch {
    // Safe to ignore outside a revalidation context
  }
  return validated;
}

export async function generateRecipePhotosAction(
  slug: string,
  count = 2,
  /** One-off art direction for this render only (not saved) */
  note?: string
): Promise<
  | { success: true; candidates: PhotoCandidate[]; errors: string[]; brief?: PhotoBrief }
  | { success: false; error: string }
> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Admin sign-in required." };
  let recipe = getRecipeBySlug(slug);
  if (!recipe) return { success: false, error: "Recipe not found." };

  // First render for this recipe: ask the art director how the drink should
  // look, and save it so later renders stay consistent. If that fails we still
  // render, using the keyword rules.
  const errors: string[] = [];
  if (!recipe.photo_brief) {
    const b = await generatePhotoBrief(recipe);
    if (b.ok) recipe = writeRecipe({ ...recipe, photo_brief: b.brief });
    else errors.push(b.error);
  }
  const brief = recipe.photo_brief;

  // A different seed per candidate (different background mix), and a
  // guaranteed-different composition for each, so the candidates side by side
  // are genuinely different shots, not the same photo with new props.
  const base = Date.now();
  const firstComposition = base % 97;
  // Drinks with a before/after look (layered, then stirred) show one of each
  const plans = Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, i) =>
    buildPhotoPlan(recipe!, base + i * 7919, {
      composition: firstComposition + i,
      brief,
      stage: brief?.stages ? (i % 2 === 0 ? "before" : "after") : undefined,
      note,
    })
  );
  const results = await Promise.all(plans.map((plan) => generatePhoto(plan.prompt)));

  const candidates: PhotoCandidate[] = [];
  results.forEach((r, i) => {
    if (r.ok) {
      candidates.push({
        jpegBase64: r.jpegBase64,
        model: r.model,
        prompt: plans[i].prompt,
        staging: [...plans[i].ingredientProps, ...plans[i].background],
        moment: plans[i].moment,
      });
    } else {
      errors.push(r.error);
    }
  });
  if (candidates.length === 0) return { success: false, error: errors[errors.length - 1] ?? "Image generation failed." };
  return { success: true, candidates, errors, brief };
}

/** Rewrites the art-director brief (e.g. when it misjudged the drink). */
export async function regeneratePhotoBriefAction(
  slug: string
): Promise<{ success: true; brief: PhotoBrief } | { success: false; error: string }> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Admin sign-in required." };
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return { success: false, error: "Recipe not found." };
  const b = await generatePhotoBrief(recipe);
  if (!b.ok) return { success: false, error: b.error };
  writeRecipe({ ...recipe, photo_brief: b.brief });
  return { success: true, brief: b.brief };
}

export async function saveRecipePhotoAction(
  slug: string,
  jpegBase64: string
): Promise<{ success: true; image: string } | { success: false; error: string }> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Admin sign-in required." };
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return { success: false, error: "Recipe not found." };

  const bytes = Buffer.from(jpegBase64, "base64");
  // Only accept real JPEGs (they start with FF D8 FF), and nothing absurdly large
  if (bytes.length < 1000 || bytes.length > 5_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { success: false, error: "That doesn't look like a valid photo." };
  }

  // A new file name each time, so browsers never show a cached old photo
  const fileName = `${slug}-ai-${Date.now().toString(36)}.jpg`;
  mkdirSync(IMAGE_DIR, { recursive: true });
  writeFileSync(path.join(IMAGE_DIR, fileName), bytes);

  // Clean up the previous AI photo for this recipe (real photos and video frames are kept)
  const previous = recipe.image;
  if (recipe.image_source === "ai" && previous?.startsWith(`/recipes/${slug}-ai-`)) {
    try {
      unlinkSync(path.join(process.cwd(), "public", previous));
    } catch {
      // Already gone; nothing to clean up
    }
  }

  const updated = writeRecipe({ ...recipe, image: `/recipes/${fileName}`, image_source: "ai" });
  return { success: true, image: updated.image! };
}
