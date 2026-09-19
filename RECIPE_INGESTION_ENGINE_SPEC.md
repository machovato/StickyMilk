# StickyMilk: Recipe Ingestion Engine (RIE) Specification

*Version:* 1.0  
*Author:* Tony Melendez & Antigravity  
*Lineage:* Adapted from the Amerigo Content Ingestion Engine (CIE) architecture  
*Status:* Active Specification  

---

## 1. Executive Summary & Vision

StickyMilk is a specialty coffee translation layer across **Cometeer (frozen extract)**, **Nespresso Vertuo (single pod)**, and **Instant (freeze-dried)**.

To keep the recipe catalog fresh, comprehensive, and scalable without a human hand-crafting every JSON file in VS Code, the **Recipe Ingestion Engine (RIE)** provides an automated, staged pipeline to:
1. **Triage & Ingest** real recipes from official vendor archives (Nespresso, Cometeer) and viral social media trends (TikTok, Instagram coffee creators).
2. **Normalize into a Recipe Intermediate Representation (IR)**, protecting all verbatim ingredient ratios and measurements.
3. **Map Coffee Profiles & Taxonomy** using our standardized 3-tier coffee model (Light, Medium, Dark) and canonical ingredient IDs.
4. **Synthesize 3-Channel Preparations** using our grounded conversion physics.
5. **Run a Deterministic QA Gate** that validates the output against `lib/recipe-schema.ts` (zero LLM self-grading).
6. **Deliver Safe Drafts** directly to `content/recipes/${slug}.json` with `status: "needs_testing"`.

---

## 2. Core Architectural Principles (Learned from CIE)

1. **Rescue Mission, Not Migrate-Everything (Triage First):**  
   We do not crawl and ingest entire websites. We filter aggressively for drinks that match StickyMilk's identity: condensed milk, textured sweet creams, cold foams, iced refreshers, and high-density coffee dynamics. OriginalLine-only or equipment-heavy recipes are rejected at Stage 0.
2. **Protect Verbatim Facts (The Token Principle):**  
   In recipes, measurements, ratios, and units are sacred. Grams, milliliters, and exact branded pod citations are locked down as immutable facts. An LLM is never allowed to creatively paraphrase or round measurements.
3. **Separation of Deterministic Code vs. LLM Judgment:**  
   Scraping, schema validation, slug collision checks, and taxonomy lookups are 100% deterministic code. LLMs are only used for step restructuring and narrative summarization.
4. **Deterministic QA Gate (No Self-Grading):**  
   Every candidate recipe must pass `validateRecipeCandidate()` and check taxonomy IDs. If a field violates schema or a coffee intensity doesn't map, the pipeline fails loudly.

---

## 3. The 4-Stage Pipeline

```
[ Source URL / Video Transcript ]
               │
               ▼
┌──────────────────────────────┐
│  STAGE 0: Ingest & Extract   │ ──> Produces raw Recipe IR (verbatim facts locked)
└──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  STAGE 1: Map & Classify     │ ──> Maps Pod to Light/Med/Dark; matches taxonomy IDs
└──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  STAGE 2: Channel Synthesis  │ ──> Generates Cometeer, Vertuo, and Instant steps
└──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  STAGE 3: Deterministic QA   │ ──> recipe-schema.ts check (Hard pass/fail)
└──────────────────────────────┘
               │
               ▼
[ content/recipes/${slug}.json (status: 'needs_testing') ]
```

---

## 4. Stage Specifications

### Stage 0: Source Adapters & Recipe IR

The **Source Adapter** extracts raw content from external URLs or social captions into a normalized, immutable JSON Intermediate Representation (**Recipe IR**).

#### Recipe IR Schema (`recipe_ir.json`)
```typescript
export interface RecipeIR {
  source_type: "nespresso" | "cometeer" | "social_tiktok" | "social_instagram" | "editorial";
  source_url: string;
  source_creator?: string;
  raw_title: string;
  stated_coffee: {
    raw_name: string;             // e.g. "Nespresso Il Caffè" or "Birch Dark Roast"
    system?: "vertuo" | "original" | "capsule" | "instant";
    intensity?: number;           // e.g. 11
    serving_size_ml?: number;     // e.g. 40
  };
  raw_ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
    notes?: string;
  }>;
  raw_steps: string[];
  metadata: {
    glassware?: string;
    temperature: "iced" | "hot" | "blended";
    prep_time_minutes?: number;
    sweetness_hint?: "none" | "subtle" | "rich_sweet" | "dessert";
  };
}
```

*Rule:* If `system === "original"` and no Vertuo pod equivalent exists, Stage 0 discards the candidate.

---

### Stage 1: Coffee Profile & Taxonomy Mapping

Stage 1 maps the raw facts in the IR to StickyMilk's canonical definitions.

#### A. Coffee Profiles Mapping Matrix
Maps vendor terminology and intensity scales into our 3 universal buckets:

| Vendor Spec | StickyMilk Bucket | `roast_note` Standard Text |
| :--- | :---: | :--- |
| **Nespresso Intensity 9–13** (e.g. *Il Caffè, Diavolitto, Altissio*)<br>**Cometeer:** *"Dark / Bold"*<br>**Instant:** Espresso powders (*Medaglia d'Oro, Bustelo*) | **`"dark"`** | *"Bold, roasty profile with low acidity to punch through sweet condensed milk or cream."* |
| **Nespresso Intensity 5–8** (e.g. *Double Espresso Chiaro, Orafio, Inizio*)<br>**Cometeer:** *"Medium / Balanced"*<br>**Instant:** Arabica crystals (*Mount Hagen, Nescafé Gold*) | **`"medium"`** | *"Balanced profile with caramel and toasted nut notes suited for flavored milks and syrups."* |
| **Nespresso Intensity 1–4** (e.g. *Voltesso, Bianco Piccolo*)<br>**Cometeer:** *"Light / Bright"*<br>**Instant:** Specialty freeze-dried (*Blue Bottle, Swift Cup*) | **`"light"`** | *"Delicate, floral profile with crisp acidity to complement sparkling tonic or citrus."* |

#### B. Ingredient Taxonomy Matching
Every ingredient is run against `content/taxonomy/ingredients.json`:
* Exact matches or known aliases automatically receive their canonical `item_id` and `default_unit`.
* Ready-to-pour flavored creamers (e.g. Chobani Sweet Cream) are tagged under the `creamer` category.
* Novel ingredients are flagged for taxonomy review.

---

### Stage 2: 3-Channel Synthesis (The Physics Layer)

Stage 2 takes the primary channel preparation and deterministically derives the other two channels using StickyMilk's conversion physics:

1. **Cometeer Conversion:**
   * 1 Nespresso Single Espresso (40 ml) or 1.5 tsp Instant $\rightarrow$ **1 Cometeer capsule (26 g)**.
   * If iced: Puck is melted into liquid concentrate before pouring.
   * If hot: Puck is melted with hot water or hot milk.
2. **Nespresso Vertuo Conversion:**
   * Single shot base: **1 single espresso pod (40 ml / 1.35 oz)**.
   * Double shot base: **1 Double Espresso pod (80 ml / 2.7 oz)** or 2 singles.
   * Auto-tip: Even pod count $\ge 2$ triggers double-shot equivalence note.
3. **Instant Specialty Conversion:**
   * Standard ratio: **1.5 tsp instant espresso powder (~3.5 g) dissolved in 2 oz (60 ml) hot water**.
   * The bloom water dissolves condensed milk/sugar completely before ice is added.

---

### Stage 3: Deterministic QA Gate & Storage

Before any recipe JSON is written to disk:
1. **Schema Check:** Executes `validateRecipeCandidate()` from `lib/recipe-schema.ts`.
2. **Verbatim Audit:** Ensures no original ingredient amounts were dropped or altered during synthesis.
3. **Status Assignment:** Every newly ingested recipe is tagged:
   ```json
   "status": "needs_testing"
   ```
4. **Write Target:** Writes atomically to `content/recipes/${slug}.json`.
5. **Cache Invalidation:** Calls `invalidateRecipeCache()` so the dev server immediately registers the new draft.

---

## 5. Automated Periodic Agent Workflow

Once the app is deployed, an autonomous subagent runs on a scheduled cadence (e.g. weekly via `/schedule`):

```bash
# Workflow: Weekly Coffee Trend Ingest
1. Trigger: Scheduled Agent wakes up.
2. Scan: Fetch top coffee-recipe feeds (Nespresso new drops + TikTok coffee creator tags).
3. Filter: Compare candidate titles/slugs against existing `content/recipes/*.json`.
4. Ingest: Run Stage 0 -> Stage 1 -> Stage 2 -> Stage 3.
5. Notification: Agent pings Tony with a summary:
   "Ingested 2 new drafts with status 'needs_testing':
    - Brown Sugar Cinnamon Cold Foam (/recipes/brown-sugar-cinnamon-cold-foam)
    - Iced Salted Caramel Vertuo (/recipes/iced-salted-caramel-vertuo)"
6. Kitchen Verification: Tony tests the drink, makes adjustments in the UI, and flips status to 'verified'.
```

---

## 6. Pilot Implementation Checklist

- [ ] Run first manual pilot on a real Nespresso Vertuo recipe.
- [ ] Inspect generated Recipe IR and final `content/recipes/*.json`.
- [ ] Verify that `validateRecipeCandidate()` passes with 0 errors.
