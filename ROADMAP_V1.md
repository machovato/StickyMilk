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

### Sprint 3: Mobile Experience & Production Readiness
- [ ] **Counter Mode View:** Ensure mobile layout is high-contrast and readable from arm's length (large tap-friendly checklist, big step font).
- [ ] **OpenGraph Social Cards:** Auto-generate brutalist preview cards for iMessage, Reddit, and Twitter sharing.
- [ ] **Static Deployment Hardening:** Ensure read-only production deploy on Vercel/Cloudflare functions cleanly without filesystem write dependencies.

### Sprint 4: The Intake Assistant (`/admin/import`)
- [ ] **Admin Paste Tool:** Simple form to paste a vendor URL or TikTok video link + raw caption/ingredients.
- [ ] **Creator-Scoped Naming:** Automatically assign `{creator_slug}-{recipe_name}.json` ensuring database migration readiness and `@unique` constraints.
- [ ] **Sub-Assembly & Phase Detection:** Parse raw ingredients and steps into multi-component sections (`group` for ingredients: Cold Foam, Base, Garnish; `## Phase N` for steps).
- [ ] **Procedural Staging Engine (*Mise en Place*):** Kitchen physics sequencing (e.g. whip cold foam / prep cold elements first as an input ingredient before pulling hot espresso over ice).
- [ ] **3-Channel Synthesis:** Fast automated drafting of Cometeer, Nespresso Vertuo, and Instant routes with calibrated liquid volumes.
- [ ] **Novel Ingredient Fallback & Taxonomy Intake:** Check incoming ingredients against `content/taxonomy/ingredients.json`. For novel items, allow graceful intake with optional `item_id`, assign category macro baselines (e.g. average fruit preserve macros), and queue for 1-click taxonomy calibration.
- [ ] **15-Second Review & Publish:** Populates the editor for quick inspection and atomic save to Git JSON.

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
