"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { Recipe } from "@/lib/types";
import { asValidatedRecipe, validateRecipeCandidate } from "@/lib/recipe-schema";
import { getAllRecipes, invalidateRecipeCache, recipeSlugExists } from "@/lib/recipes";
import { ingredientTaxonomyIds } from "@/lib/taxonomy";
import { toRecipeFileContents } from "@/lib/write-recipe";
import { isAdminAuthenticated } from "@/lib/auth";
import { extractRecipeIR, DEMO_PRESETS } from "@/lib/translator/extractor";
import { synthesizeRecipe } from "@/lib/translator/synthesis";
import { extractRecipeWithGeminiVideo } from "@/lib/translator/video-ai";
import type { RecipeIR, TranslationResult } from "@/lib/translator/types";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");

function recipeToRecipeIR(recipe: Recipe): RecipeIR {
  const prep = recipe.preparations[0];
  const isTikTok = recipe.source?.platform?.toLowerCase().includes("tiktok");
  return {
    source_type:
      recipe.source?.type === "creator"
        ? isTikTok
          ? "social_tiktok"
          : "social_instagram"
        : "editorial",
    source_url: recipe.source?.url || "",
    source_creator: recipe.source?.name
      ? {
          name: recipe.source.name,
          handle: recipe.source.handle || "@creator",
          platform: recipe.source.platform || "Instagram",
          avatar: recipe.source.avatar,
        }
      : undefined,
    generated_slug: recipe.slug,
    raw_title: recipe.name,
    stated_coffee: {
      raw_name: prep?.tested_with || "Espresso",
      shots: prep?.capsule_count || 2,
      roast_profile: prep?.roast_recommendation || "medium",
    },
    raw_ingredients:
      prep?.ingredients.map((ing) => ({
        amount: ing.amount,
        unit: ing.unit,
        item: ing.item,
        group: ing.group,
        optional: ing.optional,
      })) || [],
    raw_steps: prep?.steps || [],
    metadata: {
      temperature: recipe.format === "hot" ? "hot" : "iced",
      prep_time_minutes: prep?.prep_time_minutes || 4,
      sweetness_hint: recipe.sweetness_level,
    },
    extraction_mode: "video_multimodal_ai",
  };
}

export async function translateRecipeAction(payload: {
  url?: string;
  caption?: string;
}): Promise<{
  success: boolean;
  result?: TranslationResult;
  error?: string;
}> {
  try {
    const rawUrl = (payload.url || "").trim();
    const cleanUrl = rawUrl.split("?")[0].replace(/\/+$/, "");

    // 1. Pre-flight Deduplication Check
    if (cleanUrl) {
      const shortcodeMatch = cleanUrl.match(/(?:p|reel|reels|video)\/([A-Za-z0-9_-]+)/i);
      const shortcode = shortcodeMatch ? shortcodeMatch[1].toLowerCase() : null;

      const allExisting = getAllRecipes();
      const cached = allExisting.find((r) => {
        if (!r.source?.url) return false;
        const sUrl = r.source.url.split("?")[0].replace(/\/+$/, "").toLowerCase();
        if (sUrl === cleanUrl.toLowerCase()) return true;
        if (shortcode && sUrl.includes(shortcode)) return true;
        return false;
      });

      if (cached) {
        console.log(`[Action] Pre-flight deduplication hit for: ${cached.slug}`);
        const cachedIR = recipeToRecipeIR(cached);
        const result = synthesizeRecipe(cachedIR);
        result.recipe = cached;
        result.is_cached_hit = true;
        return {
          success: true,
          result,
        };
      }
    }

    const isPreset = DEMO_PRESETS.some(
      (p) => rawUrl && p.url.toLowerCase() === rawUrl.toLowerCase()
    );

    let ir = null;

    // 2. If it's a social video link and GEMINI_API_KEY is present, watch video with Gemini
    if (
      rawUrl &&
      !isPreset &&
      (rawUrl.includes("instagram.com") ||
        rawUrl.includes("tiktok.com") ||
        rawUrl.includes("youtube.com") ||
        rawUrl.includes("youtu.be")) &&
      process.env.GEMINI_API_KEY
    ) {
      console.log(`[Action] Triggering Gemini multimodal video extraction for: ${rawUrl}`);
      ir = await extractRecipeWithGeminiVideo(rawUrl);
    }

    // Fallback to text caption / heuristic extractor if caption/preset provided, otherwise fail loudly
    if (!ir) {
      if (payload.caption || isPreset) {
        ir = extractRecipeIR({
          url: payload.url,
          caption: payload.caption,
        });
      } else {
        return {
          success: false,
          error:
            "Could not process or extract ingredients from this video reel. Please verify the URL or paste the video caption.",
        };
      }
    }

    const result = synthesizeRecipe(ir);

    // 3. Resolve slug uniqueness
    let finalSlug = result.recipe.slug;
    if (recipeSlugExists(finalSlug)) {
      let counter = 2;
      while (recipeSlugExists(`${finalSlug}-${counter}`)) {
        counter++;
      }
      finalSlug = `${finalSlug}-${counter}`;
      result.recipe.slug = finalSlug;
    }

    // 4. Save hero thumbnail image to public/recipes (prioritize smart title frame over generic CDN thumbnail)
    const imageDir = path.join(process.cwd(), "public", "recipes");
    mkdirSync(imageDir, { recursive: true });
    const imageFileName = `${finalSlug}.jpg`;
    const imagePath = path.join(imageDir, imageFileName);

    if (ir.hero_frame_base64) {
      try {
        const buffer = Buffer.from(ir.hero_frame_base64, "base64");
        writeFileSync(imagePath, buffer);
        result.recipe.image = `/recipes/${imageFileName}`;
        console.log(
          `[Action] Saved smart hero thumbnail to: /recipes/${imageFileName} (${ir.hero_frame_reason || "selected hero frame"})`
        );
      } catch (heroErr) {
        console.warn("[Action] Failed to save hero frame thumbnail:", heroErr);
      }
    } else if (ir.thumbnail_url) {
      try {
        const imgRes = await fetch(ir.thumbnail_url);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          writeFileSync(imagePath, buffer);
          result.recipe.image = `/recipes/${imageFileName}`;
          console.log(`[Action] Saved video thumbnail to: /recipes/${imageFileName}`);
        }
      } catch (imgErr) {
        console.warn("[Action] Thumbnail download failed:", imgErr);
      }
    }

    // 5. Auto-seed into the vault as needs_testing
    result.recipe.status = "needs_testing";
    result.recipe.review = undefined;
    result.recipe.created_at = new Date().toISOString();

    const validationErrors = validateRecipeCandidate(
      result.recipe,
      ingredientTaxonomyIds()
    );

    if (validationErrors.length === 0) {
      const validated = asValidatedRecipe(result.recipe);
      const filePath = path.join(CONTENT_DIR, `${finalSlug}.json`);
      mkdirSync(CONTENT_DIR, { recursive: true });
      writeFileSync(filePath, toRecipeFileContents(validated), "utf-8");
      invalidateRecipeCache();
      try {
        revalidatePath("/");
        revalidatePath("/recipes");
        revalidatePath("/translate");
      } catch (revErr) {
        // Safe to ignore in SSR render contexts
      }
      console.log(
        `[Action] Successfully auto-ingested community recipe into vault: content/recipes/${finalSlug}.json`
      );
    } else {
      console.warn(
        `[Action] Recipe candidate had validation errors, skipped auto-write:`,
        validationErrors
      );
    }

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
    created_at: recipeCandidate.created_at || new Date().toISOString(),
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
  try {
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipe.slug}`);
    revalidatePath("/translate");
  } catch (revErr) {
    // Safe to ignore if outside revalidation context
  }

  return {
    success: true,
    slug: recipe.slug,
  };
}
