"use server";

import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { invalidateRecipeCache } from "@/lib/recipes";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");
const PUBLIC_RECIPES_DIR = path.join(process.cwd(), "public", "recipes");

export async function deleteRecipeAction(slug: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return {
        success: false,
        error: "Unauthorized: Admin access required to delete recipes.",
      };
    }

    const cleanSlug = slug.trim().toLowerCase();
    const recipeFilePath = path.join(CONTENT_DIR, `${cleanSlug}.json`);

    if (!existsSync(recipeFilePath)) {
      return {
        success: false,
        error: `Recipe file "${cleanSlug}.json" not found in vault.`,
      };
    }

    // Delete JSON file
    unlinkSync(recipeFilePath);

    // Delete associated image if it exists
    const imagePath = path.join(PUBLIC_RECIPES_DIR, `${cleanSlug}.jpg`);
    if (existsSync(imagePath)) {
      try {
        unlinkSync(imagePath);
      } catch (imgErr) {
        console.warn(`[DeleteAction] Could not delete image ${imagePath}:`, imgErr);
      }
    }

    // Invalidate caches and revalidate paths
    invalidateRecipeCache();
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath("/admin");

    console.log(`[DeleteAction] Successfully deleted recipe: ${cleanSlug}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete recipe";
    return {
      success: false,
      error: message,
    };
  }
}
