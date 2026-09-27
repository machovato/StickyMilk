import { GoogleGenAI } from "@google/genai";
import type { SweetnessLevel } from "@/lib/types";
import { slugify } from "@/lib/slugify";
import { parseIngredientLine } from "./extractor";
import type { IRRawIngredient, IRStatedCoffee, RecipeIR } from "./types";

/**
 * Vendor recipe import: Nespresso and Cometeer publish recipes on their own
 * sites. We store the FACTS (ingredients, amounts, which capsule) and link
 * back; the method is rewritten in StickyMilk's voice and vendor photos are
 * never copied. See VENDOR_IMPORT.md.
 *
 * Extraction ladder, cheapest first:
 *   1. Fetch the page (or use pasted page text when the vendor blocks us).
 *   2. Pull schema.org Recipe JSON-LD if the page has it: exact, structured.
 *   3. Gemini reads the JSON-LD or the visible page text and returns a
 *      fixed-shape recipe (structured output), with the capsule separated
 *      from the other ingredients and the method in our own words.
 *   4. No GEMINI_API_KEY: build the recipe from JSON-LD alone (no method
 *      rewrite, coarser coffee detection).
 */

export type Vendor = "nespresso" | "cometeer";

const VENDORS: Record<Vendor, { name: string; handle: string; hosts: RegExp }> = {
  nespresso: { name: "Nespresso", handle: "@nespresso", hosts: /(^|\.)nespresso\.com$/i },
  cometeer: { name: "Cometeer", handle: "@cometeer", hosts: /(^|\.)cometeer\.com$/i },
};

export function detectVendor(url: string): Vendor | null {
  let host: string;
  try {
    host = new URL(url.trim()).hostname;
  } catch {
    return null;
  }
  for (const [vendor, info] of Object.entries(VENDORS) as Array<[Vendor, (typeof VENDORS)[Vendor]]>) {
    if (info.hosts.test(host)) return vendor;
  }
  return null;
}

export type VendorExtractionResult =
  | { ok: true; ir: RecipeIR; method: "gemini" | "json_ld" }
  | { ok: false; code: "FETCH_BLOCKED" | "NO_RECIPE" | "MODEL_FAILED"; message: string };

const FETCH_TIMEOUT_MS = 20_000;
const MAX_PAGE_TEXT_CHARS = 30_000;

export async function extractVendorRecipe(
  url: string,
  pastedPageText?: string
): Promise<VendorExtractionResult> {
  const vendor = detectVendor(url);
  if (!vendor) {
    return { ok: false, code: "NO_RECIPE", message: "That isn't a Nespresso or Cometeer recipe link." };
  }

  // 1. Page content: pasted text wins (it's what the admin saw), else fetch.
  let jsonLd: Record<string, unknown> | null = null;
  let pageText = "";
  let pageTitle = "";
  const pasted = pastedPageText?.trim() || "";

  // A saved page ("Save Page As…" / view-source) is HTML: treat it like a fetch.
  const pastedHtml = /<(html|head|body|script)\b/i.test(pasted) ? pasted : "";
  if (pasted && !pastedHtml) pageText = pasted;

  if (!pageText) {
    const page = pastedHtml ? { ok: true as const, html: pastedHtml } : await fetchPage(url);
    if (!page.ok) {
      return {
        ok: false,
        code: "FETCH_BLOCKED",
        message: `${VENDORS[vendor].name} didn't let us read that page (${page.reason}). Open it in your browser, select all, copy, and paste the text into the caption box.`,
      };
    }
    jsonLd = findRecipeJsonLd(page.html);
    pageText = htmlToText(page.html);
    pageTitle = page.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
  }

  // 2/3. Gemini over JSON-LD (preferred) or page text
  if (process.env.GEMINI_API_KEY) {
    const source = jsonLd
      ? `schema.org Recipe JSON-LD:\n${JSON.stringify(jsonLd).slice(0, MAX_PAGE_TEXT_CHARS)}`
      : `Page text:\n${pageText.slice(0, MAX_PAGE_TEXT_CHARS)}`;
    const extracted = await extractWithGemini(vendor, source);
    if (extracted.ok) {
      return { ok: true, ir: buildIR(vendor, url, extracted.recipe), method: "gemini" };
    }
    if (extracted.code === "NO_RECIPE") return extracted;
    if (!jsonLd) return extracted;
    console.warn(`[Vendor] Gemini failed (${extracted.message}); falling back to JSON-LD only`);
  }

  // 4. JSON-LD only
  if (jsonLd) {
    return { ok: true, ir: irFromJsonLd(vendor, url, jsonLd, pageTitle), method: "json_ld" };
  }

  return {
    ok: false,
    code: "NO_RECIPE",
    message: process.env.GEMINI_API_KEY
      ? "We couldn't find a recipe on that page."
      : "That page has no structured recipe data, and GEMINI_API_KEY isn't set to read it.",
  };
}

// ---------------------------------------------------------------------------
// Fetching and HTML helpers

async function fetchPage(url: string): Promise<{ ok: true; html: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        // A plain browser UA; many vendor CDNs reject default fetch UAs outright.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, html: await res.text() };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "network error" };
  }
}

/** First schema.org Recipe object in the page's JSON-LD, including inside @graph. */
export function findRecipeJsonLd(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const [, body] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const found = findRecipeNode(data);
    if (found) return found;
  }
  return null;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findRecipeNode(n);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
  if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Gemini extraction

interface VendorRecipe {
  is_beverage_recipe: boolean;
  title: string;
  temperature: "iced" | "hot" | "blended";
  coffee: {
    product_name: string;
    system: "vertuo" | "original" | "cometeer" | "instant";
    count: number;
    volume_ml?: number;
    roast_profile?: "light" | "medium" | "dark";
  };
  ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
    group: "Cold Foam" | "Latte Base" | "Garnish";
    optional?: boolean;
  }>;
  steps_in_our_words: string[];
  prep_time_minutes?: number;
  sweetness: SweetnessLevel;
}

const VENDOR_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    is_beverage_recipe: { type: "boolean" },
    title: { type: "string" },
    temperature: { type: "string", enum: ["iced", "hot", "blended"] },
    coffee: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        system: { type: "string", enum: ["vertuo", "original", "cometeer", "instant"] },
        count: { type: "number" },
        volume_ml: { type: "number" },
        roast_profile: { type: "string", enum: ["light", "medium", "dark"] },
      },
      required: ["product_name", "system", "count"],
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          amount: { type: "number" },
          unit: { type: "string" },
          item: { type: "string" },
          group: { type: "string", enum: ["Cold Foam", "Latte Base", "Garnish"] },
          optional: { type: "boolean" },
        },
        required: ["item", "group"],
      },
    },
    steps_in_our_words: { type: "array", items: { type: "string" } },
    prep_time_minutes: { type: "number" },
    sweetness: { type: "string", enum: ["none", "subtle", "rich_sweet", "dessert"] },
  },
  required: ["is_beverage_recipe", "title", "temperature", "coffee", "ingredients", "steps_in_our_words", "sweetness"],
};

function buildPrompt(vendor: Vendor, source: string): string {
  const name = VENDORS[vendor].name;
  return `You are importing an official ${name} coffee recipe into StickyMilk, a home-barista recipe site.

Extract the recipe facts from the source below.

Rules:
- "coffee": the ${name} product the recipe is built on. For Nespresso give the exact capsule name (e.g. "Melozio", "Double Espresso Scuro"), system "vertuo" or "original", how many capsules, and the brewed volume in ml if stated (Vertuo sizes: 40 espresso, 80 double espresso, 150 gran lungo, 230 mug, 355 alto; convert oz to ml). For Cometeer use system "cometeer", the roast/product name, and capsule count.
- "ingredients": everything EXCEPT the coffee/capsule itself. Keep the vendor's amounts and units exactly; omit "amount" if none is given. Group milk foams as "Cold Foam" (iced) or "Latte Base" (hot milk), toppings as "Garnish", everything else "Latte Base".
- "steps_in_our_words": the method as short imperative steps REWRITTEN IN YOUR OWN WORDS. Do not copy the vendor's sentences; keep every technique detail (temperatures, order of operations, frothing, timing).
- "sweetness": how sweet the finished drink is.
- If the source is not a drink recipe (e.g. a product page or a food recipe), set "is_beverage_recipe": false.

${source}`;
}

async function extractWithGemini(
  vendor: Vendor,
  source: string
): Promise<{ ok: true; recipe: VendorRecipe } | { ok: false; code: "NO_RECIPE" | "MODEL_FAILED"; message: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(vendor, source),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: VENDOR_RECIPE_SCHEMA,
        },
      });
      const recipe = JSON.parse(resp.text || "") as VendorRecipe;
      if (!recipe.is_beverage_recipe || recipe.ingredients.length === 0) {
        return { ok: false, code: "NO_RECIPE", message: "That page doesn't look like a drink recipe." };
      }
      return { ok: true, recipe };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;
      // Only transient failures are worth another attempt
      if (status && ![429, 500, 502, 503, 504].includes(status)) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return { ok: false, code: "MODEL_FAILED", message: `Couldn't read the recipe: ${lastError}` };
}

// ---------------------------------------------------------------------------
// IR construction

function vendorCreator(vendor: Vendor) {
  const v = VENDORS[vendor];
  return { name: v.name, handle: v.handle, platform: v.name };
}

/** Vertuo brew volumes → espresso-shot equivalents, for the other channels' math. */
function shotsFor(coffee: VendorRecipe["coffee"]): number {
  if (coffee.system === "cometeer") return Math.max(1, coffee.count) * 2;
  const ml = coffee.volume_ml;
  if (!ml) return Math.max(1, coffee.count) * 2;
  if (ml <= 45) return coffee.count;
  return coffee.count * 2;
}

function buildIR(vendor: Vendor, url: string, r: VendorRecipe): RecipeIR {
  const stated: IRStatedCoffee = {
    raw_name: r.coffee.product_name,
    system: r.coffee.system === "cometeer" ? "capsule" : r.coffee.system,
    serving_size_ml: r.coffee.volume_ml,
    shots: shotsFor(r.coffee),
    capsule_count: r.coffee.count,
    roast_profile: r.coffee.roast_profile,
  };
  const ingredients: IRRawIngredient[] = r.ingredients.map((i) => ({
    amount: i.amount,
    unit: i.unit,
    item: i.item,
    group: i.group,
    optional: i.optional || undefined,
  }));

  return {
    source_type: vendor,
    source_url: url.trim(),
    source_creator: vendorCreator(vendor),
    generated_slug: vendorSlug(vendor, r.title),
    raw_title: r.title,
    stated_coffee: stated,
    raw_ingredients: ingredients,
    raw_steps: r.steps_in_our_words,
    metadata: {
      temperature: r.temperature,
      prep_time_minutes: r.prep_time_minutes || 5,
      sweetness_hint: r.sweetness,
    },
    extraction_mode: "vendor_import",
  };
}

/** Coarse fallback when there is no Gemini key: JSON-LD strings through the caption parser. */
function irFromJsonLd(
  vendor: Vendor,
  url: string,
  ld: Record<string, unknown>,
  pageTitle: string
): RecipeIR {
  const title = String(ld.name || pageTitle || `${VENDORS[vendor].name} Recipe`).trim();
  const lines = Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient.map(String) : [];

  const coffeeLine = lines.find((l) => /capsule|pod|espresso|coffee|cometeer/i.test(l));
  const ingredients = lines
    .filter((l) => l !== coffeeLine)
    .map((l) => parseIngredientLine(l, "Latte Base"))
    .filter((i): i is IRRawIngredient => i !== null);

  const ml = coffeeLine?.match(/(\d+(?:\.\d+)?)\s*ml/i)?.[1];
  const volume = ml ? Number(ml) : undefined;
  // "1 Melozio capsule (230 ml)" -> count 1, name "Melozio capsule"
  const coffee = coffeeLine ? parseIngredientLine(coffeeLine) : null;
  const coffeeName = coffee?.item.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const isIced = /ice|iced|cold/i.test(`${title} ${lines.join(" ")}`);

  return {
    source_type: vendor,
    source_url: url.trim(),
    source_creator: vendorCreator(vendor),
    generated_slug: vendorSlug(vendor, title),
    raw_title: title,
    stated_coffee: {
      raw_name: coffeeName || VENDORS[vendor].name,
      system: vendor === "cometeer" ? "capsule" : "vertuo",
      serving_size_ml: volume,
      shots: volume && volume <= 45 ? 1 : 2,
      capsule_count: coffee?.amount && coffee.unit && /pod|capsule/.test(coffee.unit) ? coffee.amount : 1,
    },
    raw_ingredients: ingredients,
    // No Gemini, no rewrite: vendor instructions are not stored verbatim.
    raw_steps: [],
    metadata: {
      temperature: isIced ? "iced" : "hot",
      prep_time_minutes: 5,
    },
    extraction_mode: "vendor_import",
  };
}

function vendorSlug(vendor: Vendor, title: string): string {
  const t = slugify(title);
  // "Nespresso Vertuo on Ice" -> "nespresso-vertuo-on-ice", not "nespresso-nespresso-..."
  return t.startsWith(vendor) ? t : `${vendor}-${t}`;
}
