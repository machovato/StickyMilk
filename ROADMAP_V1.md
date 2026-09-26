# StickyMilk V1: Master Roadmap & Build Plan

**Product Definition:** A modern, multi-channel coffee recipe hub for the coffee systems people already own.  
**Core Hook:** `MY COFFEE: [ COMETEER | NESPRESSO | INSTANT ]`  
**Aesthetic:** Editorial brutalist (sharp contrast, raw mono fonts, zero fluff, clean cards).  
**Repository:** `https://github.com/machovato/StickyMilk`

---

## 1. Executive Thesis

StickyMilk is a **hardware translation directory** for trending and classic coffee drinks.

A user sees a drink they want to make. StickyMilk answers the only question that matters:
> *"How do I make this with the coffee system currently sitting on my kitchen counter?"*

---

## 2. Provenance & Trust Hierarchy

Every recipe and channel preparation carries clear, honest provenance. We never claim a drink is physically validated when it is a calculated conversion.

| Badge / Status | Label | Meaning |
|---|---|---|
| `original` | **ORIGINAL RECIPE** | The baseline formulation as created by the source. High initial trust when from established coffee vendors. |
| `adapted` | **SM ADAPTED** | StickyMilk's calculated channel conversion. Pragmatic math (*"an instant coffee fallback is better than no drink at all"*). |
| `tested` | **⬡ SM TESTED** | Formally brewed, tasted, and approved by StickyMilk. The official stamp of approval. |
| `unwritten` | **NOT AVAILABLE** | Honest empty state when a drink cannot cleanly translate to a specific channel. |

---

## 3. Two-Tier Source Attribution Model

StickyMilk curates from two distinct sources with different trust expectations:

### Tier 1: Coffee Vendors & Roasters (High Trust Baseline)
- **Sources:** Nespresso Official, Cometeer, Blue Bottle, Starbucks, Nguyen Coffee Supply, specialty roasters.
- **Characteristics:** Professionally developed in test kitchens; high baseline reliability for the `ORIGINAL` recipe.
- **Attribution Display:** `Source: Nespresso Official [View Original Recipe ↗]`

### Tier 2: Social Media & Creators (High Velocity & Viral Trends)
- **Sources:** TikTok, Instagram Reels, YouTube Shorts.
- **Characteristics:** Viral, creative, high-energy flavor concepts. Variable quality (some are fantastic, some are like-bait).
- **Attribution Display:** `Inspired by: @CoffeeGal2008 on TikTok [Watch Video ↗]`

---

## 4. Coffee Systems Architecture (Extensibility Headroom)

The system does not lock the platform to a permanent 3-item box. Preparations are categorized by extensible **Coffee Systems**:

### Current V1 Systems:
1. **Cometeer** (Flash-frozen hyper-melt extract, ~26g puck)
2. **Nespresso** (High-bar capsule system; Vertuo double-espresso default or noted Original pull)
3. **Instant** (Freeze-dried soluble coffee concentrate)

### Planned Headroom (Post-V1):
- `Nespresso Original` (Dedicated 19-bar single espresso pull)
- `Keurig` (K-Cup drip concentrate)
- `Instant Espresso` (Fine Italian roast powders: Medaglia D'Oro, Illy)
- `Specialty Soluble` (Starbucks Premium Instant, Verve Craft Instant)

---

## 5. Phased V1 Build Sprints

### Sprint 1: UX Realignment & Provenance Engine (Completed ✓)
- [x] **Header Selector:** Rename `CHANNEL:` to `MY COFFEE: [ COMETEER | NESPRESSO | INSTANT ]`.
- [x] **Source Schema:** Add `source` object to `lib/types.ts` (`type: "vendor" | "creator" | "editorial"`, `name`, `handle`, `platform`, `url`).
- [x] **Preparation Status Schema:** Add preparation status field (`provenance?: "original" | "adapted" | "tested"` + `nespresso_system?: "vertuo" | "original"`).
- [x] **UI Badges:** Render clean, high-contrast badges for `ORIGINAL`, `SM ADAPTED`, and `⬡ SM TESTED` on recipe cards and detail pages.
- [x] **Source Byline:** Render creator/vendor credit with an external link to original video or page.
- [x] **Consumer Nutrition Profile:** Caffeine and sugar per serving with human reference points (`~1.9 cups of coffee`, `almost a full day's sugar`), with 180mg Cometeer baseline reconciled.

### Sprint 2: Search, Filters, Creators & Catalog Coverage (Completed ✓)
- [x] **Instant Search:** Add client-side keyword search input at the top of the Recipe Archive (searching title, tags, ingredients, notes, and sources).
- [x] **"My Coffee" Filter Lens & De-Selection UX:** Allow users to filter the library to recipes matching their system. Clicking an active coffee button toggles it off (`defaultChannel = null`, "Nothing selected = Show All Systems").
- [x] **Zero-Noise Detail Page Ergonomics:** Eliminated dual-selector confusion by rendering on-page channel tabs only when global coffee is unselected. Explicitly rejected cross-hardware "Peek" prompts (*"recipes for the coffee you have"*).
- [x] **Creator & Tag Routes:** Built `/creators/[handle]` (creator portfolio, bio, social linkout) and `/tags/[tag]` with clean URL architecture (zero query parameters).
- [x] **"Try These Varieties" Interlinking Policy:** Built cross-recipe carousel on detail pages enforcing internal linking (`/recipes/[slug]`) to keep users engaged on StickyMilk.
- [x] **Multi-Component Culinary Architecture:** Supported sub-assemblies (e.g. Cold Foam vs. Latte Base vs. Garnish) via `Ingredient.group` checklist subheadings and `## Phase N` workflow dividers in preparation steps.
- [x] **Cumulative Nutrition Engine:** Verified multi-phase cumulative macro sums in `lib/nutrition.ts` and added calibrated taxonomy entries for `cookie_butter` and `biscoff_cookie`.
- [x] **3-Channel Parity Sprint:** Expanded catalog to 22 recipes with 100% 3-channel parity across Cometeer, Nespresso Vertuo, and Instant.
- [x] **Front Door Portal Split (`/` vs. `/recipes`):** Moved full catalog, filter sidebar, and instant search to `/recipes` (Recipe Vault). Transformed `/` into a lean 4-block tasting flight and activation portal (Value Promise + Hardware Selector, Hero Current Obsession with 10-point test kitchen review, Translator CTA Strip, and 4-Card Counter Flight + Vault Handoff).
- [x] **Translator Staging Route (`/translate`):** Built on-demand ingestion entry point explaining the 3 superpowers (Hardware Brew Math, Nutritional Reality Check, Culinary Mise en Place) and staging the Sprint 4 pipeline.

### Sprint 3: Mobile Experience & Production Readiness
- [ ] **Counter Mode View:** Ensure mobile layout is high-contrast and readable from arm's length (large tap-friendly checklist, big step font).
- [ ] **OpenGraph Social Cards:** Auto-generate brutalist preview cards for iMessage, Reddit, and Twitter sharing.
- [ ] **Static Deployment Hardening:** Ensure read-only production deploy on Vercel/Cloudflare functions cleanly without filesystem write dependencies.

### Sprint 4: The Coffee Translator Engine (`/admin/import` & `/translate`)
*Core CTA:* **`[ TRANSLATE FOR MY COFFEE → ]`**  
*Subtext:* *"Paste a TikTok/IG reel and build your recipe here!"*

- [x] **High-Intent Ingestion Model:** Replaces dead-end "Submit a Recipe" forms with on-demand personal utility. Users bring the video they actually want; StickyMilk translates it for their counter setup and feeds the vault.
- [x] **The 3 Translation Superpowers:**
  1. **Hardware Translation Layer:** Converts source video espresso/brew methods into calibrated Cometeer (26g melt), Nespresso Vertuo (single/double pull), and Specialty Instant (hot bloom) formulations.
  2. **Nutritional Reality Check:** Calculates exact Calories, Caffeine (mg), and Sugar (g) with human reference benchmarks (*"~1.9 cups of coffee"*, *"almost a day's sugar"*), exposing the hidden macros viral videos ignore.
  3. **Culinary Staging Engine (*Mise en Place*):** Sequences video cuts into temperature-stable kitchen physics (whip cold foam first as an input ingredient; pull hot espresso over ice last).
- [x] **Creator-Scoped Naming:** Automatically assign `{creator_slug}-{recipe_name}.json` ensuring database migration readiness and `@unique` constraints.
- [x] **Sub-Assembly & Phase Detection:** Parse raw ingredients and steps into multi-component sections (`group` for ingredients: Cold Foam, Base, Garnish; `## Phase N` for steps).
- [x] **Novel Ingredient Fallback & Taxonomy Intake:** Check incoming ingredients against `content/taxonomy/ingredients.json`. For novel items, allow graceful intake with optional `item_id`, assign category macro baselines, and queue for 1-click taxonomy calibration. Added `vanilla_protein_shake` and `ground_cinnamon` to taxonomy.
- [x] **Dual-Entry Funnel:**
  - *Phase 1 (V1 Admin):* Internal tool at `/admin/import` with 1-click vault saving for curators to rapidly ingest, score, and publish drinks.
  - *Phase 2 (V2 Public):* Public `/translate` portal with 1-click trending presets (Sofia Hrdz, CoffeeGal, Fairlife Proffee), reactive `MY COFFEE` lever, live 3 superpowers HUD, and JSON export.

---

## 6. What V1 Is NOT (Guardrails)

- **NOT a scientific chemistry lab:** No pseudo-pharmaceutical jargon or fake precision.
- **NOT an autonomous bot crawler:** No brittle headless scrapers fighting TikTok bot-detection. Humans paste links; AI formats drafts.
- **NOT a premature database rewrite:** Flat JSON in Git is fast, diffable, free, and permanent for a 20–100 recipe catalog.
- **NOT gated by physical testing:** We publish useful adaptations immediately with transparent `SM ADAPTED` badges, and promote them to `⬡ SM TESTED` as we make them.

---

## 7. Database Migration Pathway (Post-V1 Scale)

When the recipe catalog grows beyond ~100 recipes or requires dynamic user submissions, the flat JSON model will migrate to PostgreSQL via Prisma:

1. **Collision-Free Slugs:** Using `{creator_slug}-{recipe_name}` ensures all file slugs directly satisfy relational `@unique` index constraints without collision risk.
2. **Stable URLs:** Zero URL churn or redirection debt when moving from static generation to database queries.
3. **Structured Taxonomy Migration:** Co-locating nutrition benchmarks directly with taxonomy rows simplifies multi-component macro calculations in SQL.
4. **Relational Linkage:** Direct foreign key mapping between `Creator` and `Recipe` models, replacing embedded JSON source blocks.

---

## 8. Curated Franchise Initiatives & Content Collections

### The "Protein Coffee" (Proffee) Collection
- **The Concept:** Captures the massive cross-over demand between fitness culture, TikTok hacks, and coffee lovers substituting café syrups with ready-to-drink (RTD) protein shakes (e.g. Fairlife Vanilla, Premier Protein, Owyn).
- **The StickyMilk Moat & Culinary Reality:**
  - *Beverage Physics & Curdling Warnings:* Not all RTD shakes handle espresso heat or coffee acidity well. Formulations react differently:
    - **Ultra-Filtered Milk (Fairlife Core Power):** Gold standard. Natural dairy base creates a silky café-latte mouthfeel, froths easily into protein cold foam, and never separates or curdles.
    - **Whey / Casein Concentrates (Premier Protein):** High protein yield (30g), but prone to curdling if hit with direct hot water. *Kitchen Rule:* Mandatory ice pack; espresso must cool over ice before adding shake.
    - **Plant-Based Protein (Owyn, Koia):** Dense viscosity requires slight water/ice dilution to prevent thick sludge.
  - *Hardware Translation Blueprint:*
    - **Nespresso:** 1 Vertuo Double Espresso Scuro (80ml) pulled directly over a tumbler full of ice, topped with 6–8 oz Fairlife Vanilla shake.
    - **Cometeer:** 1 dark roast puck melted with 1 oz water, shaken over ice with protein shake.
    - **Instant:** 2 tsp dark roast espresso crystals dissolved in 1.5 oz hot bloom water, chilled, and stirred into shake.
  - *Nutritional Engine Fit:* Directly surfaces the high-protein macro profile (`25–30g Protein`, `<3g Sugar`, `~150–180mg Caffeine`), giving fitness users the exact macro reality check they want.
  - *Taxonomy Integration:* Seed `fairlife_vanilla_shake`, `premier_protein_shake` into `content/taxonomy/ingredients.json` and associate tags: `"protein"`, `"proffee"`, `"post-workout"`.

