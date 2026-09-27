import { GoogleGenAI } from "@google/genai";
import type { SweetnessLevel } from "@/lib/types";
import { slugify } from "@/lib/slugify";
import { safeFetchPage } from "@/lib/safe-fetch";
import { parseIngredientLine } from "./extractor";
import type { IRRawIngredient, IRStatedCoffee, RecipeIR } from "./types";

/**
 * Recipe-page import: any web page with a coffee drink recipe. That covers
 * official vendor pages (Nespresso, Cometeer) and ordinary recipe blogs,
 * most of which (WordPress + WP Recipe Maker, Tasty Recipes, etc.) embed a
 * schema.org Recipe card for Google.
 *
 * We store the FACTS (ingredients, amounts, the coffee base) and credit the
 * source with a link; the method is rewritten in StickyMilk's voice and
 * photos are never copied. See RECIPE_IMPORT.md.
 *
 * Extraction ladder, cheapest first:
 *   1. Fetch the page (SSRF-guarded), or use pasted/saved page content when
 *      the site blocks server requests.
 *   2. Pull schema.org Recipe JSON-LD if present: exact, structured.
 *   3. Gemini reads the JSON-LD or the visible page text and returns a
 *      fixed-shape recipe (structured output): coffee base separated from
 *      the other ingredients, method in our own words.
 *   4. No GEMINI_API_KEY: build the recipe from JSON-LD alone (no method,
 *      coarser coffee detection).
 *
 * Vendors differ from blogs in one way: the vendor's own channel keeps the
 * vendor's exact recipe (see synthesis.ts). A blog's coffee ("2 shots
 * espresso", "1/2 cup cold brew") is translated to all three channels.
 */

export type Vendor = "nespresso" | "cometeer";

const VENDORS: Record<Vendor, { name: string; handle: string; hosts: RegExp }> = {
  nespresso: { name: "Nespresso", handle: "@nespresso", hosts: /(^|\.)nespresso\.com$/i },
  cometeer: { name: "Cometeer", handle: "@cometeer", hosts: /(^|\.)cometeer\.com$/i },
};

/** Hosts handled by the video pipeline, never by this one. */
const VIDEO_HOSTS = /(^|\.)(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)$/i;

function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname : null;
  } catch {
    return null;
  }
}

export function detectVendor(url: string): Vendor | null {
  const host = hostnameOf(url);
  if (!host) return null;
  for (const [vendor, info] of Object.entries(VENDORS) as Array<[Vendor, (typeof VENDORS)[Vendor]]>) {
    if (info.hosts.test(host)) return vendor;
  }
  return null;
}

/** True for any http(s) link that isn't a social video (those go to video-ai). */
export function isRecipePageUrl(url: string): boolean {
  const host = hostnameOf(url);
  return Boolean(host) && !VIDEO_HOSTS.test(host!);
}

export type RecipePageResult =
  | { ok: true; ir: RecipeIR; method: "gemini" | "json_ld"; vendor: Vendor | null }
  | { ok: false; code: "FETCH_BLOCKED" | "NO_RECIPE" | "MODEL_FAILED"; message: string };

const FETCH_TIMEOUT_MS = 20_000;
const MAX_PAGE_TEXT_CHARS = 30_000;

export async function extractRecipePage(url: string, pastedPageText?: string): Promise<RecipePageResult> {
  if (!isRecipePageUrl(url)) {
    return { ok: false, code: "NO_RECIPE", message: "That isn't a recipe page link." };
  }
  const vendor = detectVendor(url);

  // 1. Page content: pasted text wins (it's what the admin saw), else fetch.
  let html = "";
  let pageText = "";
  const pasted = pastedPageText?.trim() || "";

  // A saved page ("Save Page As…" / view-source) is HTML: treat it like a fetch.
  if (/<(html|head|body|script)\b/i.test(pasted)) {
    html = pasted;
  } else if (pasted) {
    pageText = pasted;
  } else {
    const page = await safeFetchPage(url, { headers: BROWSER_HEADERS, timeoutMs: FETCH_TIMEOUT_MS });
    if (!page.ok) {
      return {
        ok: false,
        code: "FETCH_BLOCKED",
        message: `We couldn't read that page (${page.reason}). Open it in your browser, select all, copy, and paste the text into the caption box.`,
      };
    }
    html = page.html;
  }

  const jsonLd = html ? findRecipeJsonLd(html) : null;
  if (html) pageText = htmlToText(html);
  const attribution = pageAttribution(url, vendor, html, jsonLd);

  // 2/3. Gemini over JSON-LD (preferred) or page text
  if (process.env.GEMINI_API_KEY) {
    const source = jsonLd
      ? `schema.org Recipe JSON-LD:\n${JSON.stringify(jsonLd).slice(0, MAX_PAGE_TEXT_CHARS)}`
      : `Page text:\n${pageText.slice(0, MAX_PAGE_TEXT_CHARS)}`;
    const extracted = await extractWithGemini(vendor, attribution.site, source);
    if (extracted.ok) {
      return { ok: true, ir: buildIR(url, vendor, attribution, extracted.recipe), method: "gemini", vendor };
    }
    if (extracted.code === "NO_RECIPE") return extracted;
    if (!jsonLd) return extracted;
    console.warn(`[RecipePage] Gemini failed (${extracted.message}); falling back to JSON-LD only`);
  }

  // 4. JSON-LD only
  if (jsonLd) {
    const ir = irFromJsonLd(url, vendor, attribution, jsonLd);
    if (!ir) {
      return { ok: false, code: "NO_RECIPE", message: "That recipe doesn't call for coffee, so there's nothing to translate." };
    }
    return { ok: true, ir, method: "json_ld", vendor };
  }

  return {
    ok: false,
    code: "NO_RECIPE",
    message: process.env.GEMINI_API_KEY
      ? "We couldn't find a recipe on that page."
      : "That page has no structured recipe card, and GEMINI_API_KEY isn't set to read it.",
  };
}

// ---------------------------------------------------------------------------
// HTML helpers

const BROWSER_HEADERS = {
  // A plain browser UA; many CDNs reject default fetch UAs outright.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

/** First schema.org Recipe object in the page's JSON-LD, including inside @graph. */
export function findRecipeJsonLd(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
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

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&frac12;/g, "1/2")
    .replace(/&frac14;/g, "1/4")
    .replace(/&frac34;/g, "3/4")
    .replace(/&amp;/g, "&");
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  const m = html.match(re) || html.match(reversed);
  return m ? decodeEntities(m[1]).trim() : undefined;
}

/** schema.org "author"/"publisher" can be a string, an object, or an array of either. */
function schemaName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return decodeEntities(value).trim() || undefined;
  if (Array.isArray(value)) return schemaName(value[0]);
  if (typeof value === "object") return schemaName((value as { name?: unknown }).name);
  return undefined;
}

interface Attribution {
  /** Publication, e.g. "Nespresso" or "The Coffee Blog" */
  site: string;
  /** Person credited, when the page names one */
  author?: string;
  handle?: string;
}

function pageAttribution(
  url: string,
  vendor: Vendor | null,
  html: string,
  jsonLd: Record<string, unknown> | null
): Attribution {
  if (vendor) return { site: VENDORS[vendor].name, handle: VENDORS[vendor].handle };
  const host = (hostnameOf(url) || "").replace(/^www\./, "");
  const site = (html && metaContent(html, "og:site_name")) || schemaName(jsonLd?.publisher) || host;
  const author = schemaName(jsonLd?.author);
  return { site, author: author && author !== site ? author : undefined };
}

// ---------------------------------------------------------------------------
// Gemini extraction

type CoffeeSystem = "vertuo" | "original" | "cometeer" | "instant" | "espresso" | "brewed" | "cold_brew";

interface PageRecipe {
  is_coffee_drink: boolean;
  title: string;
  temperature: "iced" | "hot" | "blended";
  coffee: {
    product_name: string;
    system: CoffeeSystem;
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

const PAGE_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    is_coffee_drink: { type: "boolean" },
    title: { type: "string" },
    temperature: { type: "string", enum: ["iced", "hot", "blended"] },
    coffee: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        system: {
          type: "string",
          enum: ["vertuo", "original", "cometeer", "instant", "espresso", "brewed", "cold_brew"],
        },
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
  required: ["is_coffee_drink", "title", "temperature", "coffee", "ingredients", "steps_in_our_words", "sweetness"],
};

function buildPrompt(vendor: Vendor | null, site: string, source: string): string {
  const intro = vendor
    ? `You are importing an official ${VENDORS[vendor].name} coffee recipe into StickyMilk, a home-barista recipe site.`
    : `You are importing a coffee drink recipe published on ${site} into StickyMilk, a home-barista recipe site.`;
  return `${intro}

Extract the recipe facts from the source below.

Rules:
- "coffee": the coffee base the drink is built on.
  - Nespresso capsule: exact capsule name (e.g. "Melozio", "Double Espresso Scuro"), system "vertuo" or "original", count = capsules, volume_ml = brewed volume if stated (Vertuo sizes: 40 espresso, 80 double espresso, 150 gran lungo, 230 mug, 355 alto).
  - Cometeer: system "cometeer", the roast name, count = capsules.
  - Espresso shots: system "espresso", count = number of shots.
  - Instant coffee or instant espresso powder: system "instant", count = teaspoons.
  - Brewed coffee, cold brew, or cold brew concentrate: system "brewed" or "cold_brew", count = 1, volume_ml = the amount used.
  Convert oz/cups to ml (1 oz = 30 ml, 1 cup = 240 ml).
- "ingredients": everything EXCEPT the coffee base. Keep the published amounts and units exactly; omit "amount" if none is given. Group milk foams as "Cold Foam" (iced) or "Latte Base" (hot milk), toppings as "Garnish", everything else "Latte Base".
- "steps_in_our_words": the method as short imperative steps REWRITTEN IN YOUR OWN WORDS. Do not copy the source's sentences; keep every technique detail (temperatures, order of operations, frothing, timing).
- "sweetness": how sweet the finished drink is.
- "is_coffee_drink": false if the recipe is not a drink (including coffee-flavored desserts and baked goods), or is a drink with no coffee in it.

${source}`;
}

async function extractWithGemini(
  vendor: Vendor | null,
  site: string,
  source: string
): Promise<{ ok: true; recipe: PageRecipe } | { ok: false; code: "NO_RECIPE" | "MODEL_FAILED"; message: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];
  let lastError = "";
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: buildPrompt(vendor, site, source),
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: PAGE_RECIPE_SCHEMA,
          },
        });
        const recipe = JSON.parse(resp.text || "") as PageRecipe;
        if (!recipe.is_coffee_drink || recipe.ingredients.length === 0) {
          return {
            ok: false,
            code: "NO_RECIPE",
            message: "That page doesn't look like a coffee drink recipe. StickyMilk translates coffee drinks only.",
          };
        }
        return { ok: true, recipe };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const status = (err as { status?: number }).status;
        // If quota exhausted (429) or not found, try next model immediately
        if (status === 429 || status === 404 || lastError.includes("RESOURCE_EXHAUSTED")) break;
        if (status && ![500, 502, 503, 504].includes(status)) break;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  return { ok: false, code: "MODEL_FAILED", message: `Couldn't read the recipe: ${lastError}` };
}

// ---------------------------------------------------------------------------
// IR construction

/**
 * The coffee base as espresso-shot equivalents, which drives the other
 * channels' pod choice. Rough on purpose until the brew-math engine lands:
 * 1 Vertuo double / Cometeer capsule ≈ 2 shots, 1 tsp instant ≈ ½ shot,
 * ~120 ml strong brewed coffee or cold brew ≈ 1 shot.
 */
export function shotEquivalents(coffee: PageRecipe["coffee"]): number {
  const count = Math.max(1, coffee.count || 1);
  switch (coffee.system) {
    case "cometeer":
      return count * 2;
    case "vertuo":
    case "original":
      return coffee.volume_ml && coffee.volume_ml <= 45 ? count : count * 2;
    case "espresso":
      return count;
    case "instant":
      return Math.max(1, Math.round(count / 2));
    case "brewed":
    case "cold_brew":
      return coffee.volume_ml ? Math.max(1, Math.round(coffee.volume_ml / 120)) : 2;
  }
}

function sourceCreator(a: Attribution) {
  return { name: a.author || a.site, handle: a.handle || "", platform: a.site };
}

function buildIR(url: string, vendor: Vendor | null, a: Attribution, r: PageRecipe): RecipeIR {
  const system: IRStatedCoffee["system"] = r.coffee.system === "cometeer" ? "capsule" : r.coffee.system;
  return {
    source_type: vendor ?? "web",
    source_url: url.trim(),
    source_creator: sourceCreator(a),
    generated_slug: pageSlug(vendor, a, r.title),
    raw_title: r.title,
    stated_coffee: {
      raw_name: r.coffee.product_name,
      system,
      serving_size_ml: r.coffee.volume_ml,
      shots: shotEquivalents(r.coffee),
      capsule_count: r.coffee.count,
      roast_profile: r.coffee.roast_profile,
    },
    raw_ingredients: r.ingredients.map((i) => ({
      amount: i.amount,
      unit: i.unit,
      item: i.item,
      group: i.group,
      optional: i.optional || undefined,
    })),
    raw_steps: r.steps_in_our_words,
    metadata: {
      temperature: r.temperature,
      prep_time_minutes: r.prep_time_minutes || 5,
      sweetness_hint: r.sweetness,
    },
    extraction_mode: "recipe_page",
  };
}

const COFFEE_LINE = /capsule|\bpods?\b|espresso|coffee|cold brew|cometeer|\bshots?\b/i;

/** Coarse fallback when there is no Gemini key: JSON-LD strings through the caption parser. */
function irFromJsonLd(
  url: string,
  vendor: Vendor | null,
  a: Attribution,
  ld: Record<string, unknown>
): RecipeIR | null {
  const title = decodeEntities(String(ld.name || `${a.site} Recipe`)).trim();
  const lines = (Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient : []).map((l) =>
    decodeEntities(String(l)).replace(/\s+/g, " ").trim()
  );

  // Coffee liqueur and coffee-flavored syrups aren't the coffee base
  const coffeeLine = lines.find((l) => COFFEE_LINE.test(l) && !/liqueur|syrup|creamer|ice cream/i.test(l));
  if (!coffeeLine) return null;

  const ingredients = lines
    .filter((l) => l !== coffeeLine)
    .map((l) => parseIngredientLine(l, "Latte Base"))
    .filter((i): i is IRRawIngredient => i !== null);

  // "1 Melozio capsule (230 ml)" -> count 1, name "Melozio capsule"
  const parsed = parseIngredientLine(coffeeLine);
  const name = parsed?.item.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim() || coffeeLine;
  const ml = coffeeLine.match(/(\d+(?:\.\d+)?)\s*ml/i)?.[1];
  const lower = coffeeLine.toLowerCase();
  const system: CoffeeSystem =
    vendor === "cometeer"
      ? "cometeer"
      : vendor === "nespresso"
      ? "vertuo"
      : /cold brew/.test(lower)
      ? "cold_brew"
      : /instant/.test(lower)
      ? "instant"
      : /espresso|shot/.test(lower)
      ? "espresso"
      : "brewed";
  // A count is a number of pods/capsules/shots/teaspoons, never a volume
  const count =
    parsed?.amount && (!parsed.unit || /pod|capsule|tsp/.test(parsed.unit)) ? parsed.amount : 1;
  const cupMl = parsed?.amount && parsed.unit === "cup" ? parsed.amount * 240 : undefined;
  const ozMl = parsed?.amount && parsed.unit === "oz" ? parsed.amount * 30 : undefined;
  const volume = ml ? Number(ml) : cupMl ?? ozMl;
  const coffee = { product_name: name, system, count, volume_ml: volume };

  const isIced = /\bice|iced|cold\b/i.test(`${title} ${lines.join(" ")}`);

  return {
    source_type: vendor ?? "web",
    source_url: url.trim(),
    source_creator: sourceCreator(a),
    generated_slug: pageSlug(vendor, a, title),
    raw_title: title,
    stated_coffee: {
      raw_name: name,
      system: system === "cometeer" ? "capsule" : system,
      serving_size_ml: volume,
      shots: shotEquivalents(coffee),
      capsule_count: count,
    },
    raw_ingredients: ingredients,
    // No Gemini, no rewrite: published instructions are not stored verbatim.
    raw_steps: [],
    metadata: {
      temperature: isIced ? "iced" : "hot",
      prep_time_minutes: 5,
    },
    extraction_mode: "recipe_page",
  };
}

function pageSlug(vendor: Vendor | null, a: Attribution, title: string): string {
  const t = slugify(title);
  const prefix = vendor ?? slugify(a.site.replace(/\.(com|net|org|co|blog)$/i, ""));
  // "Nespresso Vertuo on Ice" -> "nespresso-vertuo-on-ice", not "nespresso-nespresso-..."
  return t.startsWith(prefix) ? t : `${prefix}-${t}`;
}
