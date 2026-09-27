import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type {
  RecipeIR,
  VideoExtractionErrorCode,
  VideoExtractionResult,
} from "./types";
import { slugify } from "@/lib/slugify";
import { parseVideoUrl } from "./extractor";

const execFileAsync = promisify(execFile);

/** Download + frame sampling + Gemini (with its own retries) must finish in this window. */
const EXTRACTOR_TIMEOUT_MS = 120_000;

/** User-facing copy per failure. Raw extractor messages stay in server logs. */
const USER_MESSAGES: Record<VideoExtractionErrorCode, string> = {
  NOT_CONFIGURED: "Video translation isn't configured on this server. Paste the video caption instead.",
  DOWNLOAD_FAILED:
    "We couldn't download that video. The platform may be blocking us or the post may be private. Paste the video caption instead.",
  TOO_LARGE: "That video is too long to translate. Try a shorter reel, or paste the video caption.",
  NO_FRAMES: "We downloaded the video but couldn't read any frames from it. Try another link.",
  MODEL_UNAVAILABLE: "Our recipe reader is busy right now. Please try again in a minute.",
  PARSE_FAILED: "We watched the video but couldn't turn it into a recipe. Try again, or paste the caption.",
  NOT_BEVERAGE: "StickyMilk only translates coffee and specialty beverage recipes.",
  TIMEOUT: "Translating that video took too long. Please try again, or paste the video caption.",
  UNKNOWN: "Something went wrong translating that video. Please try again, or paste the video caption.",
};

function failure(
  code: VideoExtractionErrorCode,
  detail?: string,
  userMessage?: string
): VideoExtractionResult {
  console.warn(`[VideoAI] ${code}${detail ? `: ${detail}` : ""}`);
  return { ok: false, code, message: userMessage || USER_MESSAGES[code] };
}

function isKnownCode(code: unknown): code is VideoExtractionErrorCode {
  return typeof code === "string" && code in USER_MESSAGES;
}

/** Runs reel_extractor.py and returns its stdout JSON, or a typed failure. */
async function runExtractor(
  videoUrl: string
): Promise<{ ok: true; parsed: Record<string, unknown> } | { ok: false; failure: VideoExtractionResult }> {
  const scriptPath = path.join(process.cwd(), "lib", "translator", "reel_extractor.py");
  const pythonBin = process.env.PYTHON_BIN || "python3";

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(pythonBin, [scriptPath, videoUrl], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: EXTRACTOR_TIMEOUT_MS,
    }));
  } catch (err: unknown) {
    const e = err as { killed?: boolean; signal?: string; stdout?: string; stderr?: string; code?: unknown };
    if (e.killed || e.signal === "SIGTERM") {
      return { ok: false, failure: failure("TIMEOUT", `extractor exceeded ${EXTRACTOR_TIMEOUT_MS}ms`) };
    }
    // The script may still have printed a structured error before exiting non-zero
    // (e.g. an uncaught crash after partial output). Prefer that over the generic case.
    stdout = e.stdout || "";
    if (!stdout.trim().startsWith("{")) {
      const detail = e.code === "ENOENT" ? `${pythonBin} not found (set PYTHON_BIN)` : e.stderr?.slice(-500);
      return { ok: false, failure: failure("UNKNOWN", detail) };
    }
  }

  const cleanJson = stdout.trim();
  if (!cleanJson.startsWith("{")) {
    return { ok: false, failure: failure("PARSE_FAILED", `non-JSON extractor output: ${cleanJson.slice(0, 200)}`) };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    return { ok: false, failure: failure("PARSE_FAILED", "extractor output was not valid JSON") };
  }

  if (parsed.error) {
    const code = isKnownCode(parsed.code) ? parsed.code : "UNKNOWN";
    return { ok: false, failure: failure(code, String(parsed.error)) };
  }

  return { ok: true, parsed };
}

export async function extractRecipeWithGeminiVideo(
  videoUrl: string
): Promise<VideoExtractionResult> {
  if (!process.env.GEMINI_API_KEY) {
    return failure("NOT_CONFIGURED", "GEMINI_API_KEY not set");
  }

  try {
    console.log(`[VideoAI] Running high-temporal 2 FPS reel extraction for: ${videoUrl}`);
    const run = await runExtractor(videoUrl);
    if (!run.ok) return run.failure;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = run.parsed as any;

    if (parsed.is_coffee_or_beverage === false) {
      // Surface the model's own reason — it's written for the user ("this is a cooking video, not a drink").
      return failure(
        "NOT_BEVERAGE",
        parsed.rejection_reason,
        parsed.rejection_reason || USER_MESSAGES.NOT_BEVERAGE
      );
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
      hero_frame_base64: parsed.hero_frame_base64 || undefined,
      hero_frame_reason: parsed.hero_frame_reason || undefined,
    };

    return { ok: true, ir };
  } catch (err: unknown) {
    console.error("[VideoAI] Video multimodal extraction error:", err);
    return failure("UNKNOWN", err instanceof Error ? err.message : String(err));
  }
}
