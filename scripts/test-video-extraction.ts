import dotenv from "dotenv";
dotenv.config();

import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function extractFromVideo(videoUrl: string) {
  console.log("1. Resolving video from Instagram URL:", videoUrl);
  const tempFile = path.join(process.cwd(), "temp_reel.mp4");

  if (existsSync(tempFile)) unlinkSync(tempFile);

  // Download small mp4 via python -m yt_dlp
  execSync(`python -m yt_dlp -f "b[ext=mp4]/b" -o "${tempFile}" "${videoUrl}"`, {
    stdio: "inherit",
  });

  console.log("2. Video downloaded! Size:", (readFileSync(tempFile).length / 1024 / 1024).toFixed(2), "MB");

  console.log("3. Uploading video to Gemini File API...");
  // Upload to Gemini
  const uploadResult = await ai.files.upload({
    file: tempFile,
    config: {
      mimeType: "video/mp4",
    },
  });
  console.log("Uploaded file URI:", uploadResult.uri, "State:", uploadResult.state);

  const fileName = uploadResult.name!;

  // Poll until active
  let file = await ai.files.get({ name: fileName });
  while (file.state === "PROCESSING") {
    console.log("Waiting for video processing...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    file = await ai.files.get({ name: fileName });
  }

  if (file.state === "FAILED") {
    throw new Error("Video processing failed in Gemini");
  }

  console.log("4. Prompting Gemini to watch video and extract on-screen text overlays...");
  const prompt = `You are an expert barista and coffee recipe ingestion engine for StickyMilk.
Watch this coffee video carefully:
1. READ ALL ON-SCREEN TEXT OVERLAYS: Look for text stickers, ingredients, brand labels, measuring numbers, and cup markings (e.g. syrups, milks, cream, sugar, espresso).
2. LISTEN TO AUDIO: Catch any spoken ingredients or instructions.
3. WATCH THE VISUAL ACTIONS: Note if they froth cold foam first, add ice, pour milk, pull espresso.
4. Extract the recipe into strict JSON with this exact schema:
{
  "raw_title": string,
  "creator_handle": string,
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
Return ONLY valid JSON.`;

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

  console.log("\n=== GEMINI VIDEO EXTRACTION RESULT ===");
  console.log(response.text);

  // Cleanup
  if (existsSync(tempFile)) unlinkSync(tempFile);
}

extractFromVideo("https://www.instagram.com/p/DcM3BHjN-3F/").catch(console.error);
