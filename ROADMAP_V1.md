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

### Sprint 1: UX Realignment & Provenance Engine (Immediate)
- [ ] **Header Selector:** Rename `CHANNEL:` to `MY COFFEE: [ COMETEER | NESPRESSO | INSTANT ]`.
- [ ] **Source Schema:** Add `source` object to `lib/types.ts` (`type: "vendor" | "creator" | "editorial"`, `name`, `handle`, `platform`, `url`).
- [ ] **Preparation Status Schema:** Add preparation status field (`original_recipe` | `adapted` | `sm_tested`).
- [ ] **UI Badges:** Render clean, high-contrast badges for `ORIGINAL`, `SM ADAPTED`, and `⬡ SM TESTED` on recipe cards and detail pages.
- [ ] **Source Byline:** Render creator/vendor credit with an external link to original video or page.

### Sprint 2: Search, Filters & Catalog Coverage
- [ ] **Instant Search:** Add client-side keyword search input at the top of the Recipe Archive (searching title, tags, ingredients).
- [ ] **"My Coffee" Filter Lens:** Allow users to filter the library to recipes that have an active version for their selected system.
- [ ] **3-Channel Parity Sprint:** Fill in missing Nespresso and Instant adaptations for the top 12–15 core drinks so the switcher doesn't hit empty dead ends.

### Sprint 3: Mobile Experience & Production Readiness
- [ ] **Counter Mode View:** Ensure mobile layout is high-contrast and readable from arm's length (large tap-friendly checklist, big step font).
- [ ] **OpenGraph Social Cards:** Auto-generate brutalist preview cards for iMessage, Reddit, and Twitter sharing.
- [ ] **Static Deployment Hardening:** Ensure read-only production deploy on Vercel/Cloudflare functions cleanly without filesystem write dependencies.

### Sprint 4: The Intake Assistant (`/admin/import`)
- [ ] **Admin Paste Tool:** Simple form to paste a vendor URL or TikTok video link + raw caption/ingredients.
- [ ] **LLM Normalizer:** Fast extraction of creator attribution and automated drafting of Cometeer, Nespresso, and Instant routes.
- [ ] **15-Second Review & Publish:** Populates the editor for quick inspection and atomic save to Git JSON.

---

## 6. What V1 Is NOT (Guardrails)

- **NOT a scientific chemistry lab:** No pseudo-pharmaceutical jargon or fake precision.
- **NOT an autonomous bot crawler:** No brittle headless scrapers fighting TikTok bot-detection. Humans paste links; AI formats drafts.
- **NOT a database migration:** Flat JSON in Git is fast, diffable, free, and permanent for a 20–100 recipe catalog.
- **NOT gated by physical testing:** We publish useful adaptations immediately with transparent `SM ADAPTED` badges, and promote them to `⬡ SM TESTED` as we make them.
