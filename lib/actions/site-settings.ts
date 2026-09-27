"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import { updateSiteSettings } from "@/lib/site-settings";

/** Makes this recipe the homepage's Current Obsession (replaces the previous one). */
export async function setCurrentObsessionAction(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Admin sign-in required." };
  if (!getRecipeBySlug(slug)) return { success: false, error: "Recipe not found." };
  updateSiteSettings({ current_obsession: slug });
  revalidatePath("/");
  return { success: true };
}
