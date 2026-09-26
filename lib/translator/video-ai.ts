import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { RecipeIR } from "./types";
import { slugify } from "@/lib/slugify";
import { parseVideoUrl } from "./extractor";

const execFileAsync = promisify(execFile);

export async function extractRecipeWithGeminiVideo(
  videoUrl: string
): Promise<RecipeIR | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, skipping AI video analysis");
    return null;
  }

  try {
    console.log(`[VideoAI] Running high-temporal 2 FPS reel extraction for: ${videoUrl}`);
    const scriptPath = path.join(process.cwd(), "lib", "translator", "reel_extractor.py");
    const { stdout } = await execFileAsync("python", [scriptPath, videoUrl], {
      maxBuffer: 20 * 1024 * 1024,
    });

    const cleanJson = stdout.trim();
    if (!cleanJson.startsWith("{")) {
      console.warn("[VideoAI] Non-JSON output from reel extractor:", cleanJson);
      return null;
    }

    const parsed = JSON.parse(cleanJson);
    if (parsed.error) {
      console.warn(`[VideoAI] Extraction error: ${parsed.error}`);
      return null;
    }

    if (parsed.is_coffee_or_beverage === false) {
      console.warn(`[VideoAI] Content rejected by domain safety check: ${parsed.rejection_reason}`);
      throw new Error(parsed.rejection_reason || "StickyMilk only translates coffee and specialty beverage recipes.");
    }

    const detectedUploader = parsed.detected_uploader || "";
    const detectedThumbnail = parsed.detected_thumbnail || "";
    const detectedTitle = parsed.detected_title || "";

    // Clean and normalize ingredients
    const rawIngredients = (parsed.raw_ingredients || []).map(
      (ing: { amount?: number; unit?: string; item: string; group?: string; optional?: boolean }) => {
        let amt = ing.amount;
        let unit = ing.unit;
        const itemLower = ing.item.toLowerCase();

        if (amt === 0 || !amt) {
          if (itemLower.includes("ice")) {
            amt = 1;
            unit = "cup";
          } else if (itemLower.includes("milk")) {
            amt = 6;
            unit = "oz";
          } else {
            amt = undefined;
          }
        }

        if (unit === "as needed" || unit === "to fill") {
          unit = undefined;
        }

        return {
          amount: amt,
          unit: unit || undefined,
          item: ing.item,
          group: ing.group || "Latte Base",
          optional: ing.optional || undefined,
        };
      }
    );

    // Build sub assemblies
    const subAssemblies = [];
    const hasColdFoam = rawIngredients.some(
      (ing: { group?: string; item?: string }) =>
        ing.group?.toLowerCase().includes("foam") || /heavy cream|froth/i.test(ing.item || "")
    );
    if (hasColdFoam) {
      subAssemblies.push({
        name: "Cold Foam",
        type: "cold_foam" as const,
        temperature_stability: "high" as const,
      });
    }
    subAssemblies.push({
      name: "Latte Base",
      type: "base" as const,
      temperature_stability: "low" as const,
    });
    if (rawIngredients.some((i: { group?: string }) => i.group === "Garnish")) {
      subAssemblies.push({
        name: "Garnish",
        type: "garnish" as const,
        temperature_stability: "high" as const,
      });
    }

    const urlInfo = parseVideoUrl(videoUrl);
    const videoByMatch = detectedTitle.match(/Video by ([a-zA-Z0-9_.-]+)/i);
    const fallbackHandle = videoByMatch
      ? `@${videoByMatch[1]}`
      : detectedUploader
      ? `@${detectedUploader.toLowerCase().replace(/\s+/g, "")}`
      : urlInfo.handle || "@creator";

    const creatorHandle =
      parsed.creator_handle && !parsed.creator_handle.toLowerCase().includes("creator")
        ? parsed.creator_handle.startsWith("@")
          ? parsed.creator_handle
          : `@${parsed.creator_handle}`
        : fallbackHandle;

    const creatorName =
      parsed.creator_name && !parsed.creator_name.toLowerCase().includes("creator")
        ? parsed.creator_name
        : detectedUploader || fallbackHandle.replace("@", "");

    // If Gemini title is missing or generic, synthesize an appetizing name from the real ingredients
    let rawTitle = parsed.raw_title;
    if (
      !rawTitle ||
      rawTitle.toLowerCase().includes("viral specialty") ||
      rawTitle.toLowerCase() === "iced latte"
    ) {
      const ingItems = rawIngredients.map((i: { item: string }) => i.item.toLowerCase());
      const features: string[] = [];
      if (ingItems.some((i: string) => i.includes("brown sugar"))) features.push("Brown Sugar");
      if (ingItems.some((i: string) => i.includes("maple"))) features.push("Maple");
      if (ingItems.some((i: string) => i.includes("cookie butter") || i.includes("biscoff"))) features.push("Cookie Butter");
      if (ingItems.some((i: string) => i.includes("caramel"))) features.push("Caramel");
      if (ingItems.some((i: string) => i.includes("vanilla"))) features.push("Vanilla");
      if (ingItems.some((i: string) => i.includes("cinnamon"))) features.push("Cinnamon");
      if (ingItems.some((i: string) => i.includes("cold foam"))) features.push("Cold Foam");

      rawTitle = features.length > 0 ? `${features.join(" ")} Iced Latte` : "Specialty Iced Latte";
    }

    const creatorSlug = slugify(creatorHandle.replace("@", ""));
    const recipeSlug = slugify(rawTitle);
    const generatedSlug = `${creatorSlug}-${recipeSlug}`;

    const ir: RecipeIR = {
      source_type: urlInfo.sourceType,
      source_url: videoUrl,
      source_creator: {
        name: creatorName,
        handle: creatorHandle,
        platform: urlInfo.platform,
      },
      generated_slug: generatedSlug,
      raw_title: rawTitle,
      stated_coffee: {
        raw_name: parsed.stated_coffee?.raw_name || "Espresso",
        system: parsed.stated_coffee?.system || "vertuo",
        shots: parsed.stated_coffee?.shots || 2,
        roast_profile: parsed.stated_coffee?.roast_profile || "medium",
      },
      raw_ingredients: rawIngredients,
      raw_steps: parsed.raw_steps || [],
      sub_assemblies: subAssemblies,
      metadata: {
        temperature: "iced",
        prep_time_minutes: 4,
        sweetness_hint: "rich_sweet",
      },
      extraction_mode: "video_multimodal_ai",
      text_overlays: parsed.text_overlays_found || [],
      thumbnail_url: detectedThumbnail?.trim() || undefined,
    };

    return ir;
  } catch (err: unknown) {
    console.error("[VideoAI] Video multimodal extraction error:", err);
    return null;
  }
}
