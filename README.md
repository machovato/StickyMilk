# StickyMilk

A modern, multi-channel coffee recipe hub for the coffee systems people already own: **Cometeer** (flash-frozen liquid extract), **Nespresso Vertuo** (single & double espresso pods), and **Instant** (specialty soluble freeze-dried concentrate).

StickyMilk is not a static recipe archive — it is a **hardware translation directory** that bridges the gap between trending specialty coffee concepts and kitchen equipment reality.

---

## Key Features

- **"MY COFFEE" Lens & De-Selection:** Select your active coffee foundation (`Cometeer`, `Nespresso`, or `Instant`) to view tailored recipes and procedures. Click an active button to de-select (`defaultChannel = null`) and browse all systems without forced choices or noise.
- **100% 3-Channel Parity:** 22 curated recipes, each with complete, kitchen-grounded preparations across Cometeer, Nespresso Vertuo, and Instant (zero empty or unwritten states).
- **Transparent Provenance Engine:** Clear trust hierarchy on every preparation:
  - `ORIGINAL RECIPE`: Baseline formulation by the original creator or coffee house.
  - `SM ADAPTED`: StickyMilk's calculated channel conversion.
  - `⬡ SM TESTED`: Formally brewed, tasted, and approved in the kitchen.
- **Creator Attribution & Clean Routes:** Dedicated creator archives (`/creators/[handle]`) and tag pages (`/tags/[tag]`) using clean URLs with zero query parameter pollution.
- **"Try These Varieties" Interlinking:** In-page modules showcasing related creator variations with strict internal-first linking (`/recipes/[slug]`).
- **Multi-Component Culinary Architecture:** Supports sub-assemblies (e.g. Cold Foam vs. Latte Base vs. Garnish) with grouped ingredient checklists and `## Phase N` workflow dividers in preparation steps.
- **Consumer Nutrition & Caffeine Engine:** Live macro calculator (Calories, Caffeine, Sugar) with intuitive human reference points (`~1.9 cups of coffee`, `almost a full day's sugar`).
- **Portion Scaler (0.5x – 4x):** Dynamically scales ingredient amounts, secondary measurements (e.g., 26g extract pucks, 40ml espresso shots), and batch yield units.
- **Admin Authentication & Editor:** Session-based authentication protecting recipe authoring (`/recipes/new`) and editing (`/recipes/[slug]/edit`).
- **Instant Client-Side Search:** Real-time fuzzy filtering across titles, tags, flavor notes, sources, and ingredients.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS (Editorial Brutalist palette: `ink`, `cream`, `gold`, `border`)
- **Content Storage:** Flat JSON in `content/recipes/${creator_slug}-${recipe_name}.json` — fast, diffable, Git-native, and formatted for effortless PostgreSQL migration.
- **Taxonomy:** Standardized ingredient database in `content/taxonomy/ingredients.json`.
- **Database (Auth / Ratings):** Prisma 7 + SQLite (configured via driver adapters for zero-code PostgreSQL swapping).

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# 1. Install dependencies (runs prisma generate via postinstall)
npm install

# 2. Push SQLite database schema
npm run db:push

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

To verify a production build:
```bash
npm run build
```

---

## Project Structure

```
├── app/                        # Next.js App Router routes
│   ├── creators/[handle]/      # Dedicated creator portfolio archives
│   ├── tags/[tag]/             # Filtered tag archives
│   ├── recipes/[slug]/         # Interactive recipe detail pages & editor
│   ├── recipes/new/            # Admin recipe authoring wizard
│   ├── admin/                  # Admin login, logout, and session API
│   └── page.tsx                # Homepage library with sidebar filter rail
├── components/                 # React UI components
│   ├── HeaderChannelSelector.tsx # Global "MY COFFEE" selector with de-selection
│   ├── IngredientChecklist.tsx   # Sub-assembly grouped checklist
│   ├── PreparationSteps.tsx    # Phased procedure workflow engine
│   ├── RecipeVariations.tsx    # "Try These Varieties" creator carousel
│   ├── SourceAttribution.tsx   # Creator / Vendor provenance bylines
│   └── RecipeLibrary.tsx       # Search, filter rail, and recipe grid
├── content/
│   ├── recipes/                # 22 recipe JSON specs ({creator_slug}-{name}.json)
│   └── taxonomy/               # ingredients.json canonical mapping
├── lib/
│   ├── nutrition.ts            # Dynamic caffeine, sugar, and calorie engine
│   ├── recipes.ts              # Server-side recipe loader & cache invalidation
│   ├── types.ts                # TypeScript interfaces (Recipe, Preparation, etc.)
│   └── format-amount.ts        # Decimal to kitchen fraction formatter
└── prisma/
    └── schema.prisma           # Prisma 7 User & Rating relational schema
```

---

## Documentation & Architecture

- `JOURNAL.md` — The complete project history, architectural rationale, and engineering log.
- `ROADMAP_V1.md` — Master build plan, sprint tracking, and design guardrails.
- `RECIPE_INGESTION_ENGINE_SPEC.md` — 4-stage pipeline specification for the automated Intake Assistant (`/admin/import`).
- `ROAST_CITATION_MODEL_SPEC.md` — 3-tier coffee identity model (Format vs. Roast vs. Citation).
