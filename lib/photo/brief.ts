import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { PhotoBrief, Recipe } from "@/lib/types";
import style from "../../content/brand/photo-style.json";

/**
 * The photo "art director": before the first render, one quick text call asks
 * Gemini what this drink is SUPPOSED to look like (its tell, glass, colors,
 * hero detail). Gemini already knows a Ca Phe Sua Da is black coffee over a
 * white condensed-milk layer; the photo prompt just never asked. The brief is
 * saved on the recipe so re-renders stay consistent.
 */

const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

/** Words that must never appear in a prop: brewing gear, labels, clichés (brand rules). */
const BANNED_PROP = /\b(phin|filter|moka|pour.?over|chemex|aeropress|french press|machine|portafilter|grinder|beans?|kettle|label|logo|flag|hat|costume)\b/i;

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    tell: { type: "string" },
    vessel: { type: "string", enum: Object.keys(style.vessels) },
    colors: { type: "string" },
    hero_detail: { type: "string" },
    story_prop: { type: "string" },
    has_stages: { type: "boolean" },
    stage_before: { type: "string" },
    stage_after: { type: "string" },
  },
  required: ["tell", "vessel", "colors", "hero_detail", "has_stages"],
};

function briefPrompt(recipe: Recipe): string {
  const prep = recipe.preparations[0];
  const ingredients = (prep?.ingredients ?? []).map((i) => [i.amount, i.unit, i.item].filter(Boolean).join(" ")).join("; ");
  const vessels = Object.entries(style.vessels).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `You are the art director for a home-coffee recipe app. Write a short visual brief for photographing this drink.

DRINK: ${recipe.name} (${recipe.format})
DESCRIPTION: ${recipe.flavor_notes}
INGREDIENTS: ${ingredients}
STEPS: ${(prep?.steps ?? []).filter((s) => !s.startsWith("#")).join(" ")}

RULES:
${style.art_director_rules.map((r) => `- ${r}`).join("\n")}

ALLOWED VESSELS (answer with the key):
${vessels}

Return:
- tell: one sentence, what makes this drink instantly recognizable in a photo.
- vessel: the key of the best vessel.
- colors: the liquid colors, layer by layer, top to bottom.
- hero_detail: one small detail that makes the shot (garnish, spoon, foam texture...).
- story_prop: one optional prop (an ingredient or tableware), or leave empty.
- has_stages / stage_before / stage_after: only if the drink genuinely has a before and after look (e.g. layered, then stirred); describe each look in one sentence.`;
}

type RawBrief = {
  tell: string;
  vessel: string;
  colors: string;
  hero_detail: string;
  story_prop?: string;
  has_stages: boolean;
  stage_before?: string;
  stage_after?: string;
};

/** Enforces the brand rules on whatever the model returned (the prompt asks, the code makes sure). */
export function sanitizeBrief(raw: RawBrief): PhotoBrief {
  const vessel = raw.vessel in style.vessels ? raw.vessel : "iced";
  const prop = raw.story_prop?.trim();
  return {
    tell: raw.tell.trim(),
    vessel,
    colors: raw.colors.trim(),
    hero_detail: raw.hero_detail.trim(),
    story_prop: prop && !BANNED_PROP.test(prop) ? prop : undefined,
    stages:
      raw.has_stages && raw.stage_before?.trim() && raw.stage_after?.trim()
        ? { before: raw.stage_before.trim(), after: raw.stage_after.trim() }
        : undefined,
    created_at: new Date().toISOString(),
  };
}

export async function generatePhotoBrief(recipe: Recipe): Promise<{ ok: true; brief: PhotoBrief } | { ok: false; error: string }> {
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: "GEMINI_API_KEY is not set." };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const errors: string[] = [];
  for (const model of TEXT_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: briefPrompt(recipe),
        config: { responseMimeType: "application/json", responseJsonSchema: BRIEF_SCHEMA },
      });
      const raw = JSON.parse(res.text || "") as RawBrief;
      if (!raw.tell || !raw.colors) throw new Error("incomplete brief");
      return { ok: true, brief: sanitizeBrief(raw) };
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message.slice(0, 150) : String(err)}`);
    }
  }
  return { ok: false, error: `Couldn't write a photo brief: ${errors.join(" | ")}` };
}
