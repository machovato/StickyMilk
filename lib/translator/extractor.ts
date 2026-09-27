import type {
  IRRawIngredient,
  IRSourceType,
  IRStatedCoffee,
  IRSubAssembly,
  RecipeIR,
} from "./types";
import { slugify } from "@/lib/slugify";

export interface DemoPreset {
  id: string;
  label: string;
  creator: string;
  handle: string;
  platform: string;
  url: string;
  caption: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "sofia_maple_cinnamon",
    label: "Sofia Hrdz — Maple Cinnamon Cloud Latte",
    creator: "Sofia Hrdz | Fifi’s Coffee Bar",
    handle: "@sofia_hrdz",
    platform: "TikTok",
    url: "https://www.tiktok.com/@sofia_hrdz/video/7571593188838755614",
    caption: `Maple Cinnamon Cloud Latte 🍁☕️
My favorite fall cold foam recipe! So creamy and easy.

Cold Foam:
- 2 tbsp heavy cream
- 1 tbsp whole milk
- 1 tbsp maple syrup
- 1 pinch ground cinnamon

Latte Base:
- 1 cup ice
- 4 oz cold whole milk
- 1 tsp vanilla syrup
- 1 Nespresso Double Espresso Chiaro (80ml)

Garnish:
- 1 pinch ground cinnamon

Steps:
1. In a small cup, add heavy cream, milk, maple syrup, and cinnamon.
2. Froth with a handheld milk frother for 25 seconds until thick and airy. Set aside.
3. Fill your glass with ice, milk, and vanilla syrup.
4. Brew double shot espresso over ice.
5. Spoon the maple cinnamon cloud foam on top and dust with cinnamon!`,
  },
  {
    id: "coffeegal_cookie_butter",
    label: "CoffeeGal — Salted Caramel Cookie Butter Latte",
    creator: "CoffeeGal",
    handle: "@coffeegal",
    platform: "Instagram Reel",
    url: "https://www.instagram.com/reel/C8kLm9Op123/",
    caption: `Salted Caramel Cookie Butter Latte ✨🍪
You need to try warming the cookie butter before frothing! Game changer.

Cookie Butter Foam:
- 1 tbsp Biscoff cookie butter
- 2 tbsp heavy cream
- 1 tbsp milk
- 1 tsp salted caramel syrup

Base:
- 1 cup ice
- 4 oz oat milk
- 1 tsp caramel sauce
- 1 double shot espresso (dark roast)

Garnish:
- 1 crushed Biscoff cookie
- 1 tsp caramel drizzle

Steps:
1. Microwave cookie butter for 10 seconds to soften.
2. Add heavy cream, milk, and salted caramel syrup. Froth until cloud texture.
3. Drizzle caramel inside glass, add ice and oat milk.
4. Extract fresh double shot espresso over iced milk.
5. Top with cold foam and crushed Biscoff cookie crumbs.`,
  },
  {
    id: "testkitchen_proffee",
    label: "StickyMilk Test Kitchen — Fairlife Vanilla Proffee",
    creator: "StickyMilk Test Kitchen",
    handle: "@stickymilk",
    platform: "TikTok",
    url: "https://www.tiktok.com/@stickymilk/video/7599102938102",
    caption: `High-Protein Iced Vanilla Proffee 💪☕️
The viral Starbucks hack calibrated so it never curdles. 26g protein, zero chalkiness.

Base:
- 1 cup ice
- 6 oz Fairlife vanilla protein shake
- 1 double shot espresso (Nespresso Scuro or 2 tsp instant bloom)
- 1 tsp vanilla syrup

Garnish:
- 1 pinch ground cinnamon

Steps:
1. Fill a tall glass with large ice cubes.
2. Pour 6 oz of chilled Fairlife vanilla protein shake over ice.
3. Brew the double espresso shot and let cool 60 seconds (or pour directly over ice to preserve emulsion).
4. Stir gently with a straw to blend without breaking the protein emulsion.
5. Dust with ground cinnamon.`,
  },
];

export function parseVideoUrl(url: string): {
  sourceType: IRSourceType;
  platform: string;
  handle?: string;
  cleanUrl: string;
} {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("tiktok.com")) {
    const handleMatch = trimmed.match(/@([a-zA-Z0-9_.-]+)/);
    return {
      sourceType: "social_tiktok",
      platform: "TikTok",
      handle: handleMatch ? `@${handleMatch[1]}` : undefined,
      cleanUrl: trimmed,
    };
  }

  if (lower.includes("instagram.com")) {
    const handleMatch = trimmed.match(/instagram\.com\/([a-zA-Z0-9_.-]+)\/(?:reel|p)/);
    return {
      sourceType: "social_instagram",
      platform: "Instagram",
      handle: handleMatch ? `@${handleMatch[1]}` : undefined,
      cleanUrl: trimmed,
    };
  }

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return {
      sourceType: "social_youtube",
      platform: "YouTube Shorts",
      cleanUrl: trimmed,
    };
  }

  return {
    sourceType: "editorial",
    platform: "Web",
    cleanUrl: trimmed,
  };
}

function parseFraction(str: string): number | null {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 2) {
    const whole = parseFloat(parts[0]);
    const fracParts = parts[1].split("/");
    if (fracParts.length === 2 && !isNaN(whole)) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (den !== 0) return whole + num / den;
    }
  } else if (parts.length === 1 && parts[0].includes("/")) {
    const fracParts = parts[0].split("/");
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (den !== 0) return num / den;
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

const UNIT_MAP: Record<string, string> = {
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  cup: "cup",
  cups: "cup",
  ml: "ml",
  g: "g",
  gram: "g",
  grams: "g",
  scoop: "scoop",
  scoops: "scoop",
  pinch: "pinch",
  pinches: "pinch",
  dash: "pinch",
  cookie: "cookie",
  cookies: "cookie",
  pod: "pod",
  pods: "pod",
  capsule: "capsule",
  capsules: "capsule",
  bottle: "bottle",
};

export function parseIngredientLine(
  rawLine: string,
  currentGroup?: string
): IRRawIngredient | null {
  // Strip list markers ("- ", "• ", "1. ", "2) ") but not a leading quantity:
  // "3 oz half and half" must keep its 3.
  let line = rawLine.trim().replace(/^(?:[-*•]+\s*|\d+[.)]\s+)/, "").trim();
  if (!line || line.startsWith("#")) return null;

  const isOptional = /optional|to taste|if desired/i.test(line);
  line = line.replace(/\((?:optional|to taste|if desired)\)/i, "").trim();

  // Pattern: [amount] [unit] [item name]
  // e.g. "1 1/2 tbsp vanilla syrup" or "2 tbsp heavy cream" or "1 cup ice"
  const match = line.match(
    /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.*)$/
  );

  if (match) {
    const rawAmt = match[1];
    const rawUnit = (match[2] || "").toLowerCase();
    let item = match[3].trim();

    const amount = parseFraction(rawAmt) ?? undefined;
    const unit = UNIT_MAP[rawUnit];

    if (!unit && rawUnit) {
      // If rawUnit isn't a known unit, it's probably part of item
      item = `${match[2]} ${item}`;
    }

    return {
      amount,
      unit: unit || undefined,
      item,
      group: currentGroup,
      optional: isOptional || undefined,
    };
  }

  // Unitless item like "ice" or "crushed biscoff cookie"
  return {
    item: line,
    group: currentGroup,
    optional: isOptional || undefined,
  };
}

export function extractRecipeIR(params: {
  url?: string;
  caption?: string;
}): RecipeIR {
  const { url = "", caption = "" } = params;

  // Check matching preset first if caption is empty or matches preset URL
  const matchedPreset = DEMO_PRESETS.find(
    (p) =>
      (url && p.url.toLowerCase() === url.trim().toLowerCase()) ||
      (!url && caption && p.caption.trim() === caption.trim())
  );

  const effectiveUrl = url || (matchedPreset ? matchedPreset.url : "https://tiktok.com/@stickymilk/video/draft");
  const effectiveCaption = caption || (matchedPreset ? matchedPreset.caption : "");
  const urlInfo = parseVideoUrl(effectiveUrl);

  const creatorName = matchedPreset
    ? matchedPreset.creator
    : urlInfo.handle
    ? urlInfo.handle.replace("@", "")
    : "Coffee Creator";

  const creatorHandle = matchedPreset
    ? matchedPreset.handle
    : urlInfo.handle || "@creator";

  // Parse lines from caption
  const lines = effectiveCaption.split("\n").map((l) => l.trim()).filter(Boolean);

  let rawTitle = "";
  let inIngredients = false;
  let inSteps = false;
  let currentGroup = "Latte Base";

  const rawIngredients: IRRawIngredient[] = [];
  const rawSteps: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect title from first non-empty line if not set
    if (!rawTitle && !line.toLowerCase().startsWith("cold foam") && !line.toLowerCase().startsWith("ingredients")) {
      rawTitle = line.replace(/[^\w\s'-]/g, "").trim();
      continue;
    }

    // Section headings detection
    const lower = line.toLowerCase();
    if (lower.startsWith("cold foam") || lower.startsWith("sweet cream") || lower.startsWith("foam:")) {
      inIngredients = true;
      inSteps = false;
      currentGroup = "Cold Foam";
      continue;
    }
    if (lower.startsWith("base:") || lower.startsWith("latte base:") || lower.startsWith("latte:")) {
      inIngredients = true;
      inSteps = false;
      currentGroup = "Latte Base";
      continue;
    }
    if (lower.startsWith("garnish:") || lower.startsWith("topping:") || lower.startsWith("toppings:")) {
      inIngredients = true;
      inSteps = false;
      currentGroup = "Garnish";
      continue;
    }
    if (lower.startsWith("steps:") || lower.startsWith("instructions:") || lower.startsWith("method:")) {
      inSteps = true;
      inIngredients = false;
      continue;
    }
    if (lower.startsWith("ingredients:")) {
      inIngredients = true;
      inSteps = false;
      continue;
    }

    if (inSteps) {
      const stepText = line.replace(/^\d+[\.\)]\s*/, "").trim();
      if (stepText) rawSteps.push(stepText);
    } else {
      const parsedIng = parseIngredientLine(line, currentGroup);
      if (parsedIng) {
        rawIngredients.push(parsedIng);
      }
    }
  }

  // Fallback defaults if caption was empty or minimal
  if (!rawTitle) {
    rawTitle = "Viral Iced Specialty Latte";
  }

  // Detect stated coffee from ingredients
  let statedCoffee: IRStatedCoffee = {
    raw_name: "Espresso",
    system: "vertuo",
    shots: 2,
    roast_profile: "medium",
  };

  for (const ing of rawIngredients) {
    const itemLower = ing.item.toLowerCase();
    if (
      itemLower.includes("espresso") ||
      itemLower.includes("pod") ||
      itemLower.includes("nespresso") ||
      itemLower.includes("cometeer") ||
      itemLower.includes("instant") ||
      itemLower.includes("coffee")
    ) {
      if (itemLower.includes("dark") || itemLower.includes("scuro") || itemLower.includes("diavolitto")) {
        statedCoffee = {
          raw_name: ing.item,
          system: "vertuo",
          shots: 2,
          roast_profile: "dark",
          intensity: 10,
        };
      } else if (itemLower.includes("chiaro") || itemLower.includes("medium")) {
        statedCoffee = {
          raw_name: ing.item,
          system: "vertuo",
          shots: 2,
          roast_profile: "medium",
          intensity: 6,
        };
      } else if (itemLower.includes("voltesso") || itemLower.includes("light") || itemLower.includes("blonde")) {
        statedCoffee = {
          raw_name: ing.item,
          system: "vertuo",
          shots: 1,
          roast_profile: "light",
          intensity: 4,
        };
      } else {
        statedCoffee = {
          raw_name: ing.item,
          system: "vertuo",
          shots: itemLower.includes("double") ? 2 : 1,
          roast_profile: "medium",
        };
      }
      break;
    }
  }

  // Detect sub assemblies
  const subAssemblies: IRSubAssembly[] = [];
  const hasColdFoam = rawIngredients.some(
    (ing) => ing.group?.toLowerCase().includes("foam") || /heavy cream/i.test(ing.item)
  );
  if (hasColdFoam) {
    subAssemblies.push({
      name: "Cold Foam",
      type: "cold_foam",
      temperature_stability: "high",
    });
  }
  subAssemblies.push({
    name: "Iced Latte Base",
    type: "base",
    temperature_stability: "low",
  });
  if (rawIngredients.some((ing) => ing.group?.toLowerCase().includes("garnish"))) {
    subAssemblies.push({
      name: "Garnish",
      type: "garnish",
      temperature_stability: "high",
    });
  }

  // Generate collision-free slug: {creator_slug}-{recipe_name}
  const creatorSlug = slugify(creatorHandle.replace("@", "") || "creator");
  const recipeSlug = slugify(rawTitle);
  const generatedSlug = `${creatorSlug}-${recipeSlug}`;

  return {
    source_type: urlInfo.sourceType,
    source_url: effectiveUrl,
    source_creator: {
      name: creatorName,
      handle: creatorHandle,
      platform: urlInfo.platform,
      avatar: matchedPreset ? `/creators/${creatorSlug}.jpg` : undefined,
    },
    generated_slug: generatedSlug,
    raw_title: rawTitle,
    stated_coffee: statedCoffee,
    raw_ingredients: rawIngredients,
    raw_steps: rawSteps,
    sub_assemblies: subAssemblies,
    metadata: {
      temperature: "iced",
      prep_time_minutes: 4,
      sweetness_hint: "rich_sweet",
    },
  };
}
