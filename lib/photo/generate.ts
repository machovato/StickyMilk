import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";

/**
 * Turns a photo prompt into a finished JPEG using Gemini image generation.
 *
 * - The anchor photos in content/brand/anchors/ are sent with every request
 *   as the style reference ("match these"), the strongest consistency lever.
 * - Models are tried in order until one works: image-capable Gemini models
 *   first (they accept the anchor photos), then Imagen (text-only, no
 *   anchors) as a last resort. Override with PHOTO_MODELS in .env.
 * - Every result gets the same finish: 1200x1200 JPEG, quality 85.
 */

const DEFAULT_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "imagen-4.0-generate-001",
];
const OUTPUT_SIZE = 1200;
const ANCHOR_DIR = path.join(process.cwd(), "content", "brand", "anchors");

export type PhotoResult = { ok: true; jpegBase64: string; model: string } | { ok: false; error: string };

/** The style anchors as inline images (skipped quietly when the folder is empty). */
function loadAnchors(): Array<{ inlineData: { mimeType: string; data: string } }> {
  try {
    return readdirSync(ANCHOR_DIR)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .slice(0, 3) // two or three anchors is plenty; more just costs tokens
      .map((f) => ({
        inlineData: {
          mimeType: f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg",
          data: readFileSync(path.join(ANCHOR_DIR, f)).toString("base64"),
        },
      }));
  } catch {
    return [];
  }
}

/** Same crop, size and compression for every photo, whatever the model returned. */
async function finish(imageBase64: string): Promise<string> {
  const jpeg = await sharp(Buffer.from(imageBase64, "base64"))
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return jpeg.toString("base64");
}

export async function generatePhoto(prompt: string): Promise<PhotoResult> {
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: "GEMINI_API_KEY is not set." };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = (process.env.PHOTO_MODELS?.split(",").map((m) => m.trim()).filter(Boolean)) || DEFAULT_MODELS;
  const anchors = loadAnchors();
  const errors: string[] = [];

  for (const model of models) {
    try {
      if (model.startsWith("imagen")) {
        // Imagen takes text only, so the anchors can't be sent; the house style text still applies
        const res = await ai.models.generateImages({
          model,
          prompt,
          config: { numberOfImages: 1, aspectRatio: "1:1" },
        });
        const bytes = res.generatedImages?.[0]?.image?.imageBytes;
        if (bytes) return { ok: true, jpegBase64: await finish(bytes), model };
        errors.push(`${model}: no image returned`);
        continue;
      }

      // Gemini image models: prompt + anchor photos in, image out
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }, ...anchors] }],
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      });
      const image = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (image) return { ok: true, jpegBase64: await finish(image), model };
      errors.push(`${model}: no image returned`);
    } catch (err) {
      // Model not available to this key, quota, safety block... try the next one
      errors.push(`${model}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    }
  }
  console.warn("[Photo] All image models failed:\n  " + errors.join("\n  "));
  return { ok: false, error: `No image model worked for this key. Tried: ${errors.join(" | ")}` };
}
