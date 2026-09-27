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
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { extractRecipeIR, DEMO_PRESETS } from "@/lib/translator/extractor";
import { synthesizeRecipe } from "@/lib/translator/synthesis";
import { ingestTranslation } from "@/lib/translator/ingest";
import { queueSubmission } from "@/lib/submissions";
import { extractRecipePage, isRecipePageUrl } from "@/lib/translator/recipe-page-extractor";
import { extractRecipeWithGeminiVideo } from "@/lib/translator/video-ai";
import type { RecipeIR, TranslationResult } from "@/lib/translator/types";

const CONTENT_DIR = path.join(process.cwd(), "content", "recipes");

/** Non-admin visitors: uncached translations (each one a paid Gemini call) per IP. */
const PUBLIC_TRANSLATIONS_PER_WINDOW = 5;
const PUBLIC_TRANSLATION_WINDOW_MS = 10 * 60 * 1000;

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

/** Returns an error message when a non-admin has used up their paid translations. */
async function publicRateLimitError(): Promise<string | null> {
  const limit = checkRateLimit(
    `translate:${await clientIp()}`,
    PUBLIC_TRANSLATIONS_PER_WINDOW,
    PUBLIC_TRANSLATION_WINDOW_MS
  );
  if (limit.ok) return null;
  const minutes = Math.ceil(limit.retryAfterSeconds / 60);
  return `You've translated a lot of recipes in a short time. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
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
    // Only an authenticated admin may write to the vault (content/ + public/).
    // Everyone else gets a read-only preview of the translation.
    const isAdmin = await isAdminAuthenticated();
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

    let ir: RecipeIR | null = null;
    let videoError: string | undefined;

    // 2a. Recipe web page: a vendor (Nespresso / Cometeer) or any recipe site.
    // The caption box doubles as "paste the page text" for sites that block
    // server-side fetches.
    if (rawUrl && !isPreset && isRecipePageUrl(rawUrl)) {
      if (!isAdmin) {
        const limited = await publicRateLimitError();
        if (limited) return { success: false, error: limited };
      }
      const page = await extractRecipePage(rawUrl, payload.caption);
      if (!page.ok) return { success: false, error: page.message };
      ir = page.ir;
    }

    // 2b. If it's a social video link and GEMINI_API_KEY is present, watch video with Gemini
    if (
      !ir &&
      rawUrl &&
      !isPreset &&
      (rawUrl.includes("instagram.com") ||
        rawUrl.includes("tiktok.com") ||
        rawUrl.includes("youtube.com") ||
        rawUrl.includes("youtu.be")) &&
      process.env.GEMINI_API_KEY
    ) {
      if (!isAdmin) {
        const limited = await publicRateLimitError();
        if (limited) return { success: false, error: limited };
      }

      console.log(`[Action] Triggering Gemini multimodal video extraction for: ${rawUrl}`);
      const extraction = await extractRecipeWithGeminiVideo(rawUrl, payload.caption);
      if (extraction.ok) {
        ir = extraction.ir;
      } else if (extraction.code === "NOT_BEVERAGE") {
        // A definitive "this isn't a drink" — don't paper over it with the caption fallback.
        return { success: false, error: extraction.message };
      } else {
        videoError = extraction.message;
      }
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
            videoError ||
            "Could not process or extract ingredients from this video reel. Please verify the URL or paste the video caption.",
        };
      }
    }

    const result = synthesizeRecipe(ir);

    // Visitors get the translation as a preview, and it goes to the admin
    // review queue (/admin/submissions). Nothing touches the vault until the
    // admin approves it. A queue failure must not cost the visitor their recipe.
    if (!isAdmin) {
      // Demo presets and caption-only pastes aren't real submissions
      if (!rawUrl || isPreset) return { success: true, result };
      try {
        await queueSubmission(rawUrl, result);
        result.queued_for_review = true;
      } catch (queueErr) {
        console.error("[Action] Failed to queue submission for review:", queueErr);
      }
      return { success: true, result };
    }

    // 3. Admin: write recipe + hero image to the vault as needs_testing
    const ingest = await ingestTranslation(result);
    if (ingest.written) {
      try {
        revalidatePath("/");
        revalidatePath("/recipes");
        revalidatePath("/translate");
      } catch {
        // Safe to ignore in SSR render contexts
      }
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
