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

/**
 * Admin photo studio actions for the recipe edit page.
 *
 * generate: renders a few candidates (each with its own background staging)
 *           and returns them for preview. Nothing is saved.
 * save:     writes the chosen candidate to public/recipes/ and points the
 *           recipe at it, marked image_source: "ai".
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

export async function generateRecipePhotosAction(
  slug: string,
  count = 2
): Promise<{ success: true; candidates: PhotoCandidate[]; errors: string[] } | { success: false; error: string }> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Admin sign-in required." };
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return { success: false, error: "Recipe not found." };

  // A different seed per candidate, so each one gets a different background mix
  const base = Date.now();
  const plans = Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, i) => buildPhotoPlan(recipe, base + i * 7919));
  const results = await Promise.all(plans.map((plan) => generatePhoto(plan.prompt)));

  const candidates: PhotoCandidate[] = [];
  const errors: string[] = [];
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
  if (candidates.length === 0) return { success: false, error: errors[0] ?? "Image generation failed." };
  return { success: true, candidates, errors };
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

  const updated = asValidatedRecipe({ ...recipe, image: `/recipes/${fileName}`, image_source: "ai" });
  writeFileSync(path.join(CONTENT_DIR, `${slug}.json`), toRecipeFileContents(updated), "utf-8");
  invalidateRecipeCache();
  try {
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
  } catch {
    // Safe to ignore outside a revalidation context
  }
  return { success: true, image: updated.image! };
}
