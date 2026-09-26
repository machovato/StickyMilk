import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { GoogleGenAI } from "@google/genai";
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

  const ai = new GoogleGenAI({ apiKey });
  const tempFileName = `sm_reel_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    console.log(`[VideoAI] Resolving and downloading video for: ${videoUrl}`);

    // Download video using yt-dlp (limits size to <= 25MB) and grab metadata
    // Using execFile avoids Windows shell escaping and %() parameter expansion issues
    const { stdout: uploaderOut } = await execFileAsync("python", [
      "-m",
      "yt_dlp",
      "--print",
      "%(uploader)s|||%(thumbnail)s|||%(title)s",
      "--no-simulate",
      "-f",
      "b[ext=mp4]/b",
      "--max-filesize",
      "25M",
      "-o",
      tempFilePath,
      videoUrl,
    ]);

    const firstMetaLine = uploaderOut.trim().split("\n").filter((l) => l.includes("|||"))[0] || "";
    const [detectedUploader = "", detectedThumbnail = "", detectedTitle = ""] = firstMetaLine.split("|||");

    if (!existsSync(tempFilePath)) {
      console.warn("[VideoAI] Failed to download video stream to temp file");
      return null;
    }

    console.log("[VideoAI] Uploading video to Gemini File API...");
    const uploadResult = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: "video/mp4",
      },
    });

    if (!uploadResult.name) {
      console.warn("[VideoAI] Upload succeeded but no file name returned");
      return null;
    }

    const fileName = uploadResult.name;

    // Wait until Gemini finishes processing the video
    let file = await ai.files.get({ name: fileName });
    let attempts = 0;
    while (file.state === "PROCESSING" && attempts < 25) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await ai.files.get({ name: fileName });
      attempts++;
    }

    if (file.state !== "ACTIVE") {
      console.warn(`[VideoAI] Gemini file processing ended in state: ${file.state}`);
      return null;
    }

    console.log("[VideoAI] Prompting Gemini 2.5 Flash to extract text overlays and recipe...");
    const prompt = `You are an expert barista and coffee recipe ingestion engine for StickyMilk.
Watch this video carefully:
1. VERIFY DOMAIN & SAFETY: Confirm whether this is a legitimate coffee, espresso, tea, or specialty beverage preparation. If it is NOT a beverage recipe (e.g. non-drink content, prank, or inappropriate/NSFW content), set "is_coffee_or_beverage": false and provide a clear "rejection_reason".
2. READ ALL ON-SCREEN TEXT OVERLAYS: Look for text stickers, ingredients, brand labels, measuring numbers, and cup markings (e.g. syrups, milks, cream, sugar, espresso).
3. LISTEN TO AUDIO: Catch any spoken ingredients or instructions.
4. WATCH THE VISUAL ACTIONS: Note if they froth cold foam in a separate cup, add ice, pour milk, pull espresso.
5. Extract the recipe into strict JSON with this exact schema:
{
  "is_coffee_or_beverage": boolean,
  "rejection_reason": string,
  "raw_title": string,
  "creator_handle": string,
  "creator_name": string,
  "stated_coffee": {
    "raw_name": string,
    "system": "vertuo" | "original" | "capsule" | "instant",
    "shots": number,
    "roast_profile": "light" | "medium" | "dark"
  },
  "raw_ingredients": [
    {
      "amount": number,
      "unit": string,
      "item": string,
      "group": "Cold Foam" | "Latte Base" | "Garnish",
      "optional": boolean
    }
  ],
  "raw_steps": [ string ],
  "text_overlays_found": [ string ]
}
Return ONLY valid JSON matching this schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
            { text: prompt },
          ],
        },
      ],
    });

    const text = response.text || "";
    const cleanJsonMatch = text.match(/\{[\s\S]*\}/);
    if (!cleanJsonMatch) {
      console.warn("[VideoAI] Failed to extract JSON from Gemini response:", text);
      return null;
    }

    const parsed = JSON.parse(cleanJsonMatch[0]);

    if (parsed.is_coffee_or_beverage === false) {
      console.warn(`[VideoAI] Content rejected by domain safety check: ${parsed.rejection_reason}`);
      throw new Error(parsed.rejection_reason || "StickyMilk only translates coffee and specialty beverage recipes.");
    }

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
  } finally {
    if (existsSync(tempFilePath)) {
      try {
        unlinkSync(tempFilePath);
      } catch {
        // Ignored
      }
    }
  }
}
