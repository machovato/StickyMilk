# StickyMilk — Project Journal

Last updated: 2026-09-20 (Creator Architecture, De-Selection UX, Phased Procedures, Cumulative Nutrition & Ingestion Specs)

This is the handoff document. If you're picking this project up — whether
that's future-Tony or someone else — read this top to bottom before
touching code. It covers what exists, why it's built the way it is, what's
explicitly deferred, and what the next moves are. `README.md` is the quick
orientation for running the app; this file is the "why," the history, and
the pipeline. `SEED_NOTES.md`, `ROADMAP_V1.md`, and `RECIPE_INGESTION_ENGINE_SPEC.md`
are referenced inline where relevant rather than repeated here.

---

## 1. What StickyMilk is

A specialty-coffee recipe app, built around one core idea:

> StickyMilk is not a recipe library. It's a **translation layer between
> three different coffee foundations**: Cometeer (26 g flash-frozen brewed
> extract), Nespresso (Vertuo 40 ml single & 80 ml double shots), and Instant (1.5 tsp freeze-dried +
> hot water).

The same drink concept — name, flavor, mood — can be made on any of the
three, but the actual ingredients, technique, and caffeine math can differ
by channel. That's why the data model separates "the drink" (`Recipe`) from
"how you make it on a given channel" (`Preparation`) as two related but
distinct objects, from day one.

Tony is the curator/operator — building a high-trust, editorial brutalist
coffee hub with 22 hand-curated recipes holding 100% 3-channel parity,
creator attribution, and rigorous consumer nutrition calculations.

---

## 2. Stack, and why

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS.** Chosen for a
  content-heavy site that will eventually deploy to Vercel as a
  static/serverless app.
- **Recipe/preparation/promo content lives as JSON files in
  `content/recipes/`, not in a database.** This is curated editorial
  content — closer to a CMS's Markdown files than to user data. It's
  hand-edited (and now form-edited) locally, committed to git, and deployed
  as part of the build. This has one big architectural consequence covered
  in §4.
- **Prisma 7 + SQLite** for the one relational slice that actually needs a
  database: `User` and `Rating` (see `prisma/schema.prisma`). Not wired up
  to any UI yet — schema exists, nothing reads/writes it today. Deliberately
  kept Postgres-compatible (plain String/Int/Float/Boolean/DateTime, `cuid`
  ids) so moving off SQLite later is a one-line provider change plus
  swapping the driver adapter in `lib/prisma.ts`, not a rewrite.
  - **Prisma 7 breaking change, worth remembering:** connection URLs no
    longer live in `schema.prisma`. The CLI (`db:push`, `db:studio`) reads
    `DATABASE_URL` via `prisma.config.ts`; the running app gets it through
    a driver adapter (`@prisma/adapter-better-sqlite3`) constructed in
    `lib/prisma.ts`. Both read the same `.env`. This tripped us up once
    early on — if you hit "the datasource property `url` is no longer
    supported in schema files," this is why.
- **No auth, no hosting yet.** Pure localhost MVP. An `/admin` area (real
  login, presumably before any multi-user or public-facing feature) is
  planned but not started — see §7.

---

## 3. Data model (`lib/types.ts`)

```
Recipe
├── slug, name, image?
├── format: hot | iced | mocktail | cocktail | affogato | baking
├── flavor_notes        (shared across all channels — "the drink" itself)
├── barista_note?       (universal craft or sensory technique note)
├── status: draft | needs_testing | verified
├── source?: RecipeSource { type: "vendor"|"creator"|"editorial", name, handle?, platform?, url?, avatar? }
├── variations?: RecipeVariation[] { slug, title, creator, twist, url?, thumbnail } (internal links to /recipes/[slug])
├── tags: string[]      (freeform, editorial mood/occasion facets)
├── sweetness_level: none | subtle | rich_sweet | dessert
├── preparations: Preparation[]   (Cometeer, Nespresso Vertuo, Instant — 100% 3-channel parity)
├── promo?              (exists in the type, unused by any UI — see §7)
└── data_issues?: string[]        (surfaced data-quality flags, not hidden)

Preparation
├── channel: cometeer | nespresso | instant
├── provenance?: "original" | "adapted" | "tested" (transparent trust badge)
├── nespresso_system?: "vertuo" | "original"       (indicates Vertuo double/single vs OriginalLine)
├── roast_recommendation?: "light" | "medium" | "dark"
├── roast_note?: string                            (required if roast_recommendation is set)
├── tested_with?: string                           (specific blend or capsule citation)
├── capsule_count?: number                         (Cometeer only)
├── caffeine_level: full | half | decaf
├── caffeine_mg?: number                           (real scalable number at 1x batch)
├── ingredients: Ingredient[]
├── steps: string[]                                (supports "## Phase N: [Name]" workflow dividers)
├── difficulty: easy | medium | advanced
├── prep_time_minutes: number
├── servings: number
├── yield_unit?: string
├── equipment?: string[]
├── dietary?: DietaryTag[]                         (dairy-free | vegan-adaptable | contains-alcohol | decaf-friendly)
└── barista_note?: string                          (channel-specific craft tip)

Ingredient
├── amount?: number                                (0.5, 0.333 — a real decimal for portion scaling)
├── unit?: string
├── secondary_amount?: number                      (scales by same factor as amount, e.g. 26g, 40ml)
├── secondary_unit?: string
├── item: string                                   (display label)
├── item_id?: string                               (canonical ID in content/taxonomy/ingredients.json)
├── notes?: string
├── display?: string
├── scaling?: "linear" | "discrete" | "none"
├── optional?: boolean
└── group?: string                                 (sub-assembly heading, e.g. "Cookie Butter Cloud Foam")
```

**Why `tags` (freeform) and `dietary` (fixed enum) are separate fields**,
even though both could be described as "tags": `dietary` is
safety-relevant — someone might actually rely on "dairy-free" being
accurate — so it's a small, fixed, reviewable set. `tags` is fuzzy,
editorial, mood/occasion stuff ("summer", "date-night") that doesn't need
that rigor and would get lost in a fixed vocabulary anyway.

**Why `sweetness_level` and `format` are recipe-level, not
preparation-level:** they describe the drink concept itself, not how a
given channel makes it. A mocha is a mocha regardless of which coffee
foundation built it.

**Why `group` on `Ingredient` and `## Phase` in `steps` exist:** real-world
viral recipes are frequently multi-component builds (e.g. cold foam vs.
latte base vs. garnish). `group` renders clean subheadings in the
checklist, while `## Phase` inserts high-contrast workflow dividers in
the preparation steps without inflating the step count.

---

## 4. Why content is JSON files, not a database — and the constraint that follows

Recipes are edited locally and pushed via git; the Vercel deploy is
static/serverless. This has one important, easy-to-forget consequence:
**Vercel's serverless functions have a read-only filesystem outside
`/tmp`.** Anything that writes to `content/recipes/*.json` (the New Recipe
form, most obviously) can only ever run against a local dev filesystem —
in production, a write either throws or silently vanishes on the next cold
start. This is why the New Recipe form (§5.4) is gated out of production
in two independent places, not just hidden from nav.

`lib/recipes.ts` reads the directory at request time and caches the parsed
array in a module-level variable (`let cache: Recipe[] | null`). That cache
is **not** the same thing as Next.js's own route/data cache — they're two
separate layers. Hand-editing a recipe file requires restarting `next dev`
(nothing watches `content/` for you); the New Recipe form instead calls
`invalidateRecipeCache()` after a successful write so a new recipe shows up
immediately, on top of also calling Next's `revalidatePath()`.

---

## 5. What's been built, in order, and why

### 5.1 MVP scaffold + seed conversion

Two raw AI-generated seed batches (16 recipes total) were converted into
the Recipe/Preparation schema above. Two explicit constraints from the
start: **don't invent recipes to fill gaps** (16 was enough), and **flag
data contradictions rather than silently resolving them**.

One real contradiction surfaced: a Tiramisu recipe's source data implied
both a specific roast and a caffeine level that didn't match (call it "the
Tiramisu bug"). It was standardized to decaf rather than guessed at, and
the fix was recorded rather than silently made — see `SEED_NOTES.md` for
the full account.

**Seed dedup correction:** a third party ("Gemini," consulted as an
outside thought-partner on this project) proposed collapsing 5 "duplicate"
recipe pairs down to ~11 total recipes. On inspection, 2 of those 5 pairs
were genuinely different recipes, not duplicates — Coffee Tonic
(grapefruit vs. plain/lemon) and Espresso Martini (shaken single-serving
decaf vs. blended frozen two-serving half-caf) — and the Cà Phê Sữa Đá
merge would have wrongly collapsed a distinct hot variant (Cà Phê Sữa
Nóng) into the iced one. The corrected plan merged only the 2 truly
duplicate pairs (iced Vietnamese coffee, and Affogato), landing at **14
recipes**, not 11 or 16. This is why you'll see `grapefruit-coffee-tonic`
and `layered-coffee-tonic` as separate files, and both
`ca-phe-sua-da.json` and `ca-phe-sua-nong-phin-style-no-phin.json` — that
distinction was deliberately preserved, not an oversight.

Only 2 of the 14 recipes (`ca-phe-sua-da`, `vanilla-oat-latte`) have
Nespresso/Instant preparations actually written; the rest are Cometeer-only
by design — **never fabricate a preparation that wasn't in the source
data.** The empty-preparation state (§5.3) exists specifically to handle
this honestly instead of hiding the gap.

### 5.2 Metadata & discovery upgrade

Added `tags`, `sweetness_level`, structured `Ingredient` objects (replacing
plain strings), `image`, `servings`, `equipment`, `dietary` — the fields
listed in §3 that existed before this session. This is also when
`lib/recipes.ts` gained fail-fast validation: a malformed recipe file now
throws a specific, file-named error at load time ("content/recipes/x.json
is invalid: - missing `flavor_notes`") instead of crashing deep in a
component with a cryptic "Cannot read properties of undefined." This
mattered in practice: extracting a zip over an existing folder doesn't
delete files that were removed from the archive, so a stale pre-migration
recipe file once caused exactly the crash this validation was built to
prevent — see the git history / earlier conversation for the specific
incident. **Lesson:** whenever content shape changes, expect stale local
files to surface as validation errors, not silent bugs. That's the
intended behavior, not a defect.

### 5.3 Recipe Detail redesign ("editorial coffee kitchen tool")

The detail page was functionally fine but read like a database record.
Redesigned around five priorities, in this order of importance:

1. **Method Selector** (`components/MethodSelector.tsx`) — "How are you
   making it?" Presents Cometeer/Nespresso/Instant as method choices (with
   real subtitle copy: "Frozen brewed coffee · Craft foundation," etc.),
   not filter tabs. Deliberately a new component, not a reuse of the
   Library page's `ChannelToggle` — same underlying `Channel` state, but a
   different UI job (the Library filters a list; this is choosing how
   you're building the thing in front of you).
2. **Barista Diff / "Why this changes"** (`components/BaristaDiff.tsx` +
   `lib/barista-diff.ts`) — a static, type-safe lookup keyed by channel
   (method flow, coffee base, and a plain-language reason the prep
   differs). Deliberately **not** derived from any recipe's data — the
   physical translation between foundations doesn't vary recipe to
   recipe, so this is the same three sentences everywhere, which keeps it
   honest (no risk of inventing per-recipe "coffee science").
3. **Editorial Hero** (`components/DrinkVisual.tsx`) — replaced a plain
   gradient placeholder with format-specific vessel silhouettes (mug,
   tall glass, coupe, highball, dessert coupe, skillet) as clean SVG
   outlines. Falls back to a real photo via `recipe.image` when set (none
   are yet). Never implies a garnish/glass/ingredient that isn't actually
   in the data.
4. **Ingredient Checklist** (`components/IngredientChecklist.tsx`) — real
   numeric scaling (see below), checkable rows, a progress counter ("N of
   M ready"), local component state only (not persisted — resets on
   channel switch, since that's a different ingredient list; survives a
   scale change).
5. **StickyMilk Dial — built, then removed. See §5.6.**

Plus: `PreparationSteps.tsx` (numbered steps with a deterministic
extracted-verb label — see `lib/step-verbs.ts` below), `EmptyPreparation
State.tsx` (editorial "X build not tested yet" message with quick-switch
buttons to available channels), and `BuildYourBar.tsx` (a static, no-fake-
products "Build your StickyMilk bar" placeholder section for future
editorial commerce).

**Portion scaling is real, not cosmetic** — `IngredientChecklist` actually
multiplies `amount * scale` and reformats it (`lib/format-amount.ts` turns
decimals back into kitchen fractions: 0.5 → "1/2"). This was a deliberate
call: an earlier draft of the redesign spec suggested UI-only scaling
("do not build a real scaling engine yet"), but since ingredients were
already structured as `{amount, unit, item}` by this point, real scaling
was strictly cheaper than faking it — the "don't build a scaling engine"
warning existed to prevent fragile string-parsing, which was never the
plan.

**`lib/step-verbs.ts`** deserves a specific mention: it extracts a leading
action verb ("STIR," "POUR," "MELT") from a step's own text via a fixed
whitelist, never inventing or rewriting the instruction. The whitelist was
built by scanning every step across all 14 recipes (79 steps total) and is
exhaustive for *today's* content, not a general verb detector — a future
recipe using a new verb just falls back to the generic "STEP" label until
someone adds it to the whitelist. This was verified by running the exact
79 steps through it: exactly one correctly falls back ("Do not swap in two
full-caf capsules...," a caution, not an instruction).

**Palette:** warm editorial coffee tones — `amber-50`/`stone-50` creams,
`stone-900`/`amber-950` espresso darks — applied to the shared root
layout and header (not just the detail page), specifically rejecting
`slate`/`zinc` cold-tech-gray and any generic purple-SaaS look. This was a
deliberate, explicit instruction, not a default Tailwind choice.

### 5.4 New Recipe form (`/recipes/new`)

The authoring tool: a local-development-only Server Action that writes
directly to `content/recipes/${slug}.json`. Full design spec lives in
`NEW_RECIPE_FORM_SPEC.md` — read that for the field-by-field layout. The
architectural decisions worth remembering here:

- **One canonical validator, two consumers, not two copies of the rules.**
  `lib/recipe-schema.ts` is the single place that knows what a valid
  `Recipe` looks like — it returns a flat `FieldError[]` (`{path,
  message}`) rather than throwing. `lib/recipes.ts` (the reader) wraps it
  and adds the one reader-specific check (slug must match filename) before
  throwing a file-named error. `lib/actions/create-recipe.ts` (the writer)
  wraps the same validator and maps errors onto specific form fields
  instead of throwing. **Important correction that happened mid-build:**
  this does *not* mean reader and writer have identical behavior — they
  react differently to the same rules — and it's explicitly not a claim
  that schema drift becomes impossible forever. It's one canonical rule
  set today; when the model changes, it changes in one file, and both
  sides re-derive their errors from `unknown` input at runtime rather than
  trusting a TypeScript type (which doesn't exist at runtime anyway).
- **The submitted payload is treated as untrusted input, full stop.** The
  client serializes its entire draft into one JSON string in a hidden
  form field; the Server Action independently: checks the field exists,
  safely parses the JSON (catches malformed JSON), re-validates against
  the canonical schema, re-checks the slug against the filesystem (not
  trusted from any client-side "is this available?" check — that check
  exists only for UX, the authoritative one runs immediately before
  write), and only then writes the file. Client-side validation is UX,
  never the source of truth.
- **Structured ingredient fields added, not yet consumed:**
  `display`/`scaling`/`optional`/`group` on `Ingredient`, and
  `yield_unit` on `Preparation` (so a cookie recipe can say "12 cookies"
  instead of "12 servings"). All additive/optional — existing recipes
  don't have them and don't need to. None of these are wired into any
  scaling/rendering logic yet; they exist so the form can capture them now
  and future work has real data to build on instead of guessing from unit
  strings.
- **Authoring shortcuts, kept deliberately dumb:** "Copy ingredients from
  Cometeer" (Nespresso/Instant blocks) does a literal copy, no semantic
  classification of which ingredients are "the coffee part." "Duplicate to
  [channel]" clones an entire preparation as an explicit starting point —
  never silently assumes caffeine/quantities/steps/difficulty carry over
  correctly. Both come with visible "review this" language rather than
  pretending to be smart.
- **Readiness indicator is derived, not a separate scoring system** — it
  runs the same canonical validator against the current draft and buckets
  the resulting errors into "Basics" + one line per enabled channel. This
  was a specific ask: don't invent a second notion of "complete."
- **Preview reuses the real `RecipeDetail` component** against the
  in-progress draft, gated behind full validity (so it can't render a
  broken recipe) — deliberately not a second rendering path, to avoid
  preview/production drift.
- **Production gating happens twice, independently:** the page
  (`app/recipes/new/page.tsx`) calls `notFound()` when
  `NODE_ENV === "production"`; the Server Action checks the same condition
  itself, so it refuses even if something calls it directly rather than
  through the page's form.
- **Git stays manual.** A successful save writes the file and says so —
  it never runs `git add`/`commit`. That's a deliberate human checkpoint.
- **Create-only in this pass.** Editing an existing recipe (prefill from
  file, and the harder question of what a slug rename does — it'd mean
  delete-old-file-and-write-new, which is destructive) is explicitly
  deferred to a later pass, once the create flow has actually been used.

### 5.5 Global footer

Minimal, warm, editorial — brand/tagline left, nav/channel-list/copyright
right on desktop, stacked on mobile. Deliberately **only links to routes
that actually exist** (just `/` today) rather than the placeholder
"About"/"How it works" links a draft spec suggested. A dev-only "+ New
recipe" link was added afterward as a stand-in until a real `/admin` area
exists — gated the same way the page itself is
(`NODE_ENV !== "production"`), so it disappears automatically once this
ships.

### 5.6 StickyMilk Dial: built, then deliberately removed

The Dial (Milk/Body, Sweetness, Finish, "Your version" summary) shipped as
part of §5.3, then was removed in this same session after a design
conversation exposed a real problem with it. Recording the reasoning in
full, since this is exactly the kind of decision a future contributor
could otherwise "fix" by re-adding it.

**What happened:** Tony raised extending the Dial with a "Flavor Bar"
(syrups/flavored creamers — Torani/Monin-style, sugar-free variants,
tied to affiliate commerce). Working through the design surfaced a sharper
question: `Recipe.status` includes `"verified"` — a real claim that a
specific, exact recipe was tested and works. An open-ended Dial sitting
directly on that page (pick any milk × any sweetness × any syrup ×
any finish) quietly breaks that claim: "verified" was true for the recipe
*as written*, never for whatever combination a visitor dials into. Worse,
none of the Dial's axes had any awareness of each other or of the
recipe's own data — e.g. nothing stopped someone from selecting "Rich"
sweetness on Cà Phê Sữa Đá, a recipe already tagged `rich_sweet` from its
condensed milk alone. Making the Dial "smarter" about that collision would
require either (a) fabricating specific culinary adjustments ("use 1 tbsp
SCM instead of 2") with no real basis — the same category of problem as
inventing a flavor note, or (b) just flagging the mismatch without fixing
it, which still leaves an inert, half-useful control sitting on a page
that's supposed to read as authoritative.

**Decision:** pull all "make it your way" functionality off the recipe
page entirely, rather than trim it down. A partially-scoped Dial is worse
than no Dial — it still implies "tweak me" on a page whose whole value
proposition is "we already tested this exact thing." `Method Selector` and
`Barista Diff` stay, because neither is optional customization — Method
Selector is "how are you actually making this" (forced by what hardware a
visitor owns, not a preference), and Barista Diff is factual.

**Where the idea goes instead:** a standalone tool, working name "Counter
Barista" (also discussed as "Dial Me a Drink") — pantry-input-first
("what do you have?"), living at its own route, explicitly **not**
claiming to be tested. Two-stage design, refined from a proposal Tony
brought from an outside consult (credited as "Gemini" in this project's
history — see §1):

1. **Catalog-first match.** If a visitor's inputs (channel, dairy,
   temperature, etc.) match an existing recipe, surface it directly:
   "Exact match: Cà Phê Sữa Đá — kitchen-tested." This is the highest-value
   part and the cheapest to build — it's a deterministic filter against
   already-verified content, no AI involved. **Real prerequisite, not yet
   built:** this needs recipes to carry a structured, queryable dairy-type
   facet. Ingredients are free-text (`"item": "sweetened condensed milk"`)
   today, not a matchable tag — either add a facet, or accept fuzzy text
   matching (fragile, will misfire on phrasing).
2. **Generative fallback.** No catalog match → generate an "Experimental
   Build," clearly badged as untested, never written into
   `content/recipes/*.json` directly. This is the project's first
   real AI-generation feature — needs an actual LLM call grounded in the
   channel physics already captured in `lib/barista-diff.ts` (so it
   doesn't suggest "melting" instant coffee), and needs **structured
   output** (a JSON schema / tool call the model fills in), not prose —
   otherwise the "save this as a draft" bridge into `/recipes/new`
   (genuinely good idea: generate → like it → promote to a real draft →
   test it → mark verified) is a manual retype, not a real pipe.

Not started. Queued in §8. Visual language note for whoever builds it:
match the existing restrained/editorial palette (warm cream/stone, thin
rules, typography-led) — an early mockup for this used a heavy
emoji-and-card style that would read as off-brand against the rest of the
site.

### 5.7 Ingredient taxonomy (`content/taxonomy/ingredients.json`)

Prompted by a legitimate question: ingredients, flavors, and other
metadata need to be "repeatable and searchable" as more filters/
customization get built (this is also the real prerequisite the Counter
Barista catalog-match step needs — see §5.6). The question was whether that
justifies moving off JSON files onto a real database. **Decision: no, not
yet** — the storage engine and the data-modeling problem are separate
issues. A normalized *vocabulary* (a small, curated set of canonical
ingredient concepts, cross-referenced from recipes) solves the actual
problem — free-text duplication ("ice" vs. "Ice", "Cocoa powder" vs.
"cocoa powder" vs. "Unsweetened cocoa powder") — without giving up the
git-diffable, statically-deployable content model. A real relational DB
still isn't warranted until there's concurrent multi-editor writing, or a
real need to join recipe content against `User`/`Rating` (which do
legitimately live in Prisma already).

**What this is:** `content/taxonomy/ingredients.json` is a flat array of
canonical ingredient concepts — `{ id, name, category, allergens, aliases,
default_unit? }`. `Ingredient.item_id?: string` (new, optional, additive —
`lib/types.ts`) lets a recipe's ingredient line optionally point at one of
these, while `item` stays the real free-text display string shown on the
page. `lib/taxonomy.ts` reads and fail-fast-validates the file (same
pattern as `lib/recipes.ts`: cached per process, throws a specific error
naming the bad entry rather than crashing deep in a component).

**Two corrections made to the original 4-step plan, both agreed before
building:**
1. **No `flavors.json` yet.** Nothing in the schema today (`Ingredient`,
   `Preparation`, `Recipe`) structurally represents a "flavor" facet —
   only `flavor_notes` prose exists. Building a flavor taxonomy now would
   mean inventing categories with nothing to attach them to — a dead file.
   Revisit once/if a real flavor-facet field exists.
2. **Added `default_unit?: string`** to the taxonomy entry shape (not in
   the original plan) — without it, "auto-populates standard `item` names
   *and units*" had nothing to actually populate units from. Grounded in
   the unit each ingredient actually uses across the 14 recipes (e.g.
   `sweetened_condensed_milk` → `tbsp`, `cometeer_capsule` → `capsule`);
   omitted where usage doesn't settle on one unit (e.g. "ice": sometimes
   `cup`, sometimes unitless).

**Validation stays layered, not baked in.** `validateRecipeCandidate()` in
`recipe-schema.ts` takes an *optional* second argument, a `Set<string>` of
known taxonomy ids — when passed, it additionally checks that any
`item_id` present matches a real entry; when omitted, it still checks
`item_id`'s basic shape (non-empty string) but skips the membership check.
The function itself never reads `content/taxonomy/` — it stays a pure
function, taxonomy-unaware by default, exactly like it stays
filesystem-unaware about slugs. Both callers that care (`lib/recipes.ts`'s
loader, the New Recipe form's Server Action) load the id set once via
`ingredientTaxonomyIds()` and pass it in — the Server Action re-checks
fresh, immediately before writing, mirroring the existing slug-collision
re-check (never trusts a client-side taxonomy snapshot).

**Form integration:** `IngredientRowEditor` takes the loaded taxonomy and
an ingredient-name `<datalist>` (same free-text-preserving pattern as the
existing unit autocomplete) — typing an exact taxonomy name or alias
auto-fills `item_id` and, if the unit field is still blank, `default_unit`.
Editing `item` away from that match clears `item_id` automatically, so it
can never silently point at the wrong ingredient. Nothing about this
restricts what an author can type; matching is pure convenience.

**Backfill:** of 98 ingredient lines across the 14 core recipes, **92 were
tagged** with a real `item_id`, grounded in the actual `item` strings in
those files (extracted and counted, not guessed) — 44 taxonomy entries
total, covering everything from `cometeer_capsule` (unifying 7 phrasing
variants like "melted"/"fully melted"/"fully melted and chilled") down to
one-off items like `egg_yolk`. **The 6 left untagged are genuine compound
alternatives** — `"vanilla gelato or ice cream"`, `"cola or lemon-lime
soda"`, `"sweet cream or half-and-half"`, `"vanilla syrup or honey"`,
`"ladyfingers or graham crackers"`, `"mascarpone or cream cheese,
softened"` — deliberately left without a single `item_id` rather than
picking one side of the "or" or inventing a merged concept; this is the
same never-fabricate-data principle that's governed this project
throughout.

### 5.8 Two portion-scaling bugs, fixed on real-usage report

Found by actually using the 2x/4x portion scaler on a live recipe page
(exactly the kind of thing that only shows up from real use, not design) —
worth recording since both are instances of the same underlying mistake:
a fact that's really proportional to `amount` was stored as static text
instead of a number.

1. **`Preparation.capsule_count`** (shown under "Recipe details") wasn't
   multiplied by `scale` at all — it's a separate field from the ingredient
   list's own `amount`, and whoever wrote that block of `RecipeDetail.tsx`
   just missed it. Fixed: `Math.round(prep.capsule_count * scale)`.
2. **The bigger one:** several ingredient lines had a second quantity
   embedded as plain text in `notes` — "26 g extract" (Cometeer capsule →
   grams of frozen extract), "40 ml" / "1.35 oz / 40 ml" (Nespresso pod →
   liquid yield), "90 ml" / "60 g" (hot water → metric equivalent). All of
   these are real, linear conversions of that ingredient's own `amount` —
   but `notes` is static display text, so at 2x/4x they kept showing the
   1x number. Tony caught this by actually scaling `ca-phe-sua-da` and
   noticing the "(90 ml)" next to a doubled "6 oz hot water" hadn't moved,
   and correctly called hardcoding the fix "lazy" — the ask was a real
   mechanism, not a per-recipe patch.

   **Fix:** new `Ingredient.secondary_amount?: number` /
   `secondary_unit?: string` — a second quantity that scales by the exact
   same multiplier as `amount` (both stored at 1x), rendered as
   `"6 oz (180 ml)"` by `formatIngredientAmount()` in
   `lib/format-amount.ts`. Validated in `recipe-schema.ts`
   (`secondary_amount` requires `amount` to also be present — it has
   nothing to scale relative to otherwise). Backfilled across all 18
   recipes: 25 ingredient lines now carry a real `secondary_amount`, each
   value pulled from what the note already said (26 g/capsule, 40 ml/pod,
   90 ml / 60 g for the two hot-water cases) — the backfill script
   cross-checked every capsule/pod value against its ingredient's own
   `amount` (26 g × capsule count, 40 ml × pod count) and would have
   thrown on a mismatch; none did, which is itself a small integrity check
   on the original data.

   **What stayed in `notes` on purpose:** two comparisons that are *not*
   proportional to this ingredient's `amount` — `layered-coffee-tonic`'s
   "stands in for a 1 oz espresso, not a Vertuo 2.7 oz double" and
   `ca-phe-sua-nong-phin-style-no-phin`'s "replaces a phin loaded with
   ~18–20 g dark roast" — both compare this ingredient to a *different*
   reference brew, so scaling this ingredient's `amount` shouldn't scale
   those numbers. The rule going forward: if a fact in `notes` would need
   to change when `amount` changes, it belongs in `secondary_amount` /
   `secondary_unit`, not text.

   New Recipe form gained matching "Also show as (amt) / unit" fields on
   each ingredient row, with an inline reminder that it's for a real
   per-unit conversion, not a one-off comparison.

5.9. **Nespresso Vertuo double-shot equivalence tip.** Tony noticed
   `ca-phe-sua-da` at 2x shows "2 pods" via Nespresso, but never mentions
   that a real Vertuo "Double Espresso" pod (Chiaro/Scuro/Dolce — a real
   product line, ~2x the coffee dose of a single pod) is a valid
   substitute for two singles. Explicitly paused before any code
   ("Don't fix anything, this needs to be flushed out") in favor of a
   written spec first: `NESPRESSO_DOUBLE_SHOT_SPEC.md`.

   Tony then pasted a Gemini review of that spec claiming two issues.
   Both were independently verified against the repo (the session's
   standing practice for any pasted third-party AI report) before
   touching anything:
   - **Confirmed:** only 2 of 6 Nespresso recipes had
     `item_id: "nespresso_pod"` set — the other 4 (the Grok-added lattes)
     used text ("Nespresso Original espresso") that never matched the
     taxonomy's name or alias list, so the spec's "nothing to backfill"
     claim was wrong.
   - **Confirmed:** the spec's tip copy hardcoded "(≈80 ml)" regardless
     of pod count — wrong at 4x (2 double pods ≈ 160 ml, not 80).

   **Fix:** added "Nespresso Original espresso" as a taxonomy alias on
   `nespresso_pod` and backfilled `item_id` onto the 4 remaining
   recipes (classic-hot-latte, classic-iced-latte, maple-cinnamon-latte,
   sticky-latte) rather than loosen the feature's gating logic; dropped
   the ml figure from the tip text entirely. Built in
   `components/RecipeDetail.tsx`: a dynamic tip line under the portion
   scaler, shown only when the channel is Nespresso, the prep has an
   ingredient with `item_id === "nespresso_pod"`, and the scaled pod
   count is a whole even number ≥ 2. See `NESPRESSO_DOUBLE_SHOT_SPEC.md`
   §8 for the full verification writeup.

5.10. **"Nespresso Original" → "Nespresso Vertuo" rename.** Tony flagged
   that the ingredient text/taxonomy name still said "Nespresso Original
   pod" right after the double-shot tip shipped — a real contradiction,
   since OriginalLine has no double-shot pod at all (the whole tip only
   makes sense for Vertuo). Tony confirmed all Nespresso recipes are meant
   to assume Vertuo (the modern machine, and what he owns), listing single
   shots with the double-shot tip as the built-in note for 2x+ — which
   also works fine for OriginalLine owners, since a plain single-pod count
   is all OL ever needed anyway. Renamed the ingredient text and taxonomy
   entry across all 6 Nespresso-pod recipes to "Nespresso Vertuo pod,
   brewed as a single shot," keeping the old "Original" phrasings as
   taxonomy aliases rather than churning the id.

5.11. **Coffee identity: mandatory format vs. recommended roast vs.
   citation.** Tony pushed back on `Preparation.roast` baking in a
   specific roaster/blend name (e.g. "Intelligentsia Black Cat Classic
   Espresso") as if it were required — real usage doesn't work that way
   (Cometeer ships variety boxes; you use whatever capsule's in the
   freezer). Worked through the model with Tony and a pasted Gemini
   review across several turns, landing on a three-tier split: format +
   ratios are mandatory (already fully modeled via existing `amount`/
   `unit`, no change needed there); a roast-family nudge (Light/Medium/
   Dark, no compound jargon) is optional and advisory, set only where a
   real, statable pairing reason exists; the specific product is an
   optional citation, never a requirement. A later "Premium" recipe tier
   (deliberately spotlighting one specific capsule, e.g. Cometeer's
   pricier Stellar-series drops) was discussed and explicitly shelved —
   Tony has no such recipes today — but fits the model without new schema,
   via the existing `tags` field.

   **Fix:** `Preparation.roast?: string` replaced with three fields —
   `roast_recommendation?: "light" | "medium" | "dark"`, `roast_note?:
   string` (required whenever a recommendation is set — a bucket with no
   stated reason is the exact problem being fixed), and `tested_with?:
   string` (citation, independent of the other two, available on every
   channel). Validated in `recipe-schema.ts`. Form (`PreparationEditor.tsx`)
   gained a Light/Medium/Dark select, a reason field shown only when a
   level is picked, and a separate "Tested with" field.

   Backfilled across the 18 Cometeer preps: `tested_with` carried the old
   roast string forward on all 18; `roast_recommendation` + `roast_note`
   set on 6 where a real reason exists (condensed-milk/acidity clash:
   cà phê sữa đá, cà phê sữa nóng, sticky latte; citrus/tonic pairing:
   grapefruit and layered coffee tonic; needs boldness against cold
   cream/sweet mascarpone: black cat affogato, both tiramisu recipes) —
   the other 12 got neither, deliberately, including two espresso
   martinis where the "needs to read through vodka and liqueur" argument
   was real but weaker than the other six. Flagged in
   `ROAST_CITATION_MODEL_SPEC.md` §9: this specific backfill judgment is
   mine, from general coffee knowledge, not verified against a source
   this session — worth Tony's own read before treating it as settled.

   One side effect: `one-bowl-mocha-skillet-cookie` had a standing
   `data_issues` flag from an earlier session (`roast` said "Equator
   Mocha Java," a full-caf roast, contradicting its "half" caffeine
   level). Its ingredient notes already named the actual half-caf pick
   ("Birch Coffee Half Day Dark Half Caff") — using that for
   `tested_with` resolves the mismatch instead of carrying it forward, so
   the flag was removed rather than migrated.

5.12. **Homepage reskin — "Sài Gòn Sweet" palette + left-rail filters.**
   Tony ran the current homepage through Google Stitch for visual
   reimagining. Two rounds of exploration: three prompts covering three
   directions grounded in the "Sticky Milk"/Vietnamese-coffee brand
   territory (Sài Gòn Sweet, Sticky Gold, Sensorial Sticky), then a
   pasted Gemini brand-mood brief that added real texture (condensed
   milk's physicality, tropical climate, Sữa Ông Thọ nostalgia) but also
   invented content worth catching: fabricated culinary "chicory" framing
   (not actually Vietnamese), and later, invented-precision stats on the
   generated mockups themselves ("Viscosity: Ultra-Gloss," "64% Sugar
   Saturation, 8.2% Milk Fat Density") that read as real measurements but
   aren't — flagged rather than ported over, since it directly conflicts
   with this project's whole discipline around never stating a number
   without a real source. Also caught: one mockup's sidebar invented a
   "Hardware Protocol" filter (phin/portafilter/moka) that doesn't exist
   in the data model — the app is built around exactly three channels
   (Cometeer/Nespresso/Instant), not brew equipment.

   Tony picked "Sài Gòn Sweet" for layout, color, and theming
   specifically — explicit that he didn't want to get attached to
   fabricated content, just placement/intent/delivery: the left-rail
   filter panel and the darker recipe-card treatment.

   **Built:** centralized theme tokens in `globals.css` (`ink`,
   `ink-soft`, `ink-muted`, `cream`, `cream-deep`, `gold`, `gold-dark`,
   `gold-soft`, `border`, `border-dark`) replacing raw `stone-*`/
   `amber-*`/`neutral-*` Tailwind classes that were scattered across the
   app — a future palette change is now a one-file edit, not a grep
   sweep. Applied to `layout.tsx`, `Footer.tsx`, `ChannelToggle.tsx`,
   `ChipFilterGroup.tsx` (also relaid out for a vertical rail — label
   above chips, not beside), `RecipeCard.tsx`, and `DrinkVisual.tsx`
   (gained a `compact` variant for card-sized use). `RecipeLibrary.tsx`
   restructured into a two-column layout: a sticky left sidebar holding
   all the filters, recipe grid on the right. Added one real "Why it
   works" editorial block — condensed milk's sugar content resisting
   curdling against acidic coffee, a genuine dairy-chemistry fact, no
   invented figures attached to it.

   Two more stale `Preparation.roast` references turned up and got fixed
   in the process (the roast/citation migration missed these):
   `RecipeLibrary.tsx`'s Roast filter and `RecipeCard.tsx`'s card detail
   row were both still reading the removed field, so the Roast filter
   silently never populated and cards never showed a roast badge — both
   now read `roast_recommendation`.

   **Deliberately out of scope for this pass:** `RecipeDetail.tsx` and
   the New Recipe form (`RecipeForm.tsx`, `PreparationEditor.tsx`,
   `IngredientRowEditor.tsx`) still use the old palette — Tony's ask was
   specifically about the homepage/library view. The filter-panel
   collapse behavior (dropdowns vs. a slide drawer, discussed earlier)
   is also still deferred, pending Tony's decision once he'd seen the
   Stitch mockups.

5.13. **V1 Master Roadmap, Editorial Brutalist Realignment & Provenance Engine.**
   Shifted StickyMilk from an early prototype toward a focused, high-contrast
   editorial platform (`ROADMAP_V1.md`). Established the central product hook:
   `MY COFFEE: [ COMETEER | NESPRESSO | INSTANT ]`. Built the transparent
   Provenance Trust Model (`original`, `adapted`, `tested`) in `lib/types.ts`
   and UI badges (`components/StatusBadge.tsx` and `components/ProvenanceBadge.tsx`):
   - `original`: The source's baseline recipe formulation. High initial trust
     when originating from established coffee houses or test kitchens.
   - `adapted`: StickyMilk's calculated channel conversion (*"an instant coffee
     fallback is better than no drink at all"*).
   - `tested`: `⬡ SM TESTED` — formally brewed, tasted, and approved in the kitchen.
   Achieved 100% 3-channel parity across all 22 recipes in the catalog (zero
   unwritten fallback states across Cometeer, Nespresso Vertuo, and Instant).
   Integrated real-time client-side keyword search indexing recipe names, tags,
   flavor notes, and ingredients. Built session-based admin authentication
   (`/admin/login`) protecting recipe editing and management routes.

5.14. **Consumer Nutrition & Caffeine Profile Engine.**
   Added live nutritional intelligence in `lib/nutrition.ts` and `components/RecipeDetail.tsx`
   computing calories, caffeine (mg), and sugar (g) dynamically based on portion
   scale. Reconciled Cometeer caffeine to a standardized 180 mg benchmark
   (reflecting high-solubles 26 g frozen pucks) and Nespresso Vertuo single espresso
   to ~80 mg. Crucially, translated raw lab numbers into intuitive human reference
   points (`"~1.9 cups of coffee"`, `"almost a full day's sugar"`, `"1/3 daily sugar"`),
   grounding macro data in visceral consumer reality without pseudo-scientific jargon.

5.15. **Creator Provenance & Social Video Sourcing.**
   Expanded beyond vendor recipes to embrace viral social media drinks (TikTok/Reels).
   Onboarded viral creations including Sofia Hrdz's Cookie Butter Cloud Latte
   (`@sofia_hrdz`), Lacey Glasley's Creamer Latte (`@laceyglasley`), and MainStMuse's
   Swirled Latte (`@mainstmuse`). Built dedicated creator profiles (`/creators/[handle]`)
   and tag archives (`/tags/[tag]`), adhering strictly to clean URL architecture
   (e.g. `/creators/@sofia_hrdz`, zero query parameter pollution). Featured creator
   avatars, video stills, and explicit source attribution (`SourceAttribution.tsx`)
   with external links out to the original social posts.

5.16. **"Try These Varieties" Interlinking Policy.**
   Integrated a modular "Try These Varieties" carousel on recipe pages (`RecipeVariations.tsx`)
   showcasing creator spins on trending drinks. Established a strict architectural
   rule: **Internal-First Linking**. Variation cards route internally to `/recipes/[slug]`
   so users remain immersed in StickyMilk's multi-channel translation experience,
   rather than bouncing out to third-party social apps. External links to original
   TikTok/Instagram videos remain exclusively on the detail page as honest source attribution.

5.17. **Creator-Scoped Slugs & Database Migration Readiness.**
   Standardized recipe naming and file paths to `{creator_slug}-{recipe_name}.json`
   (e.g. `sofia_hrdz-cookie-butter-cloud-latte.json`). Addressed future migration
   concerns: moving from flat JSON files to a relational database (PostgreSQL / Prisma)
   requires `@unique` slug constraints. Generic slugs (`cookie-butter-latte`) inevitably
   collide when multiple creators publish variations of the same drink. Scoping
   by creator guarantees global uniqueness, prevents URL churn, avoids fragile
   ID remapping, and ensures a seamless 1:1 migration into a database table.

5.18. **"My Coffee" Hardware Selector UX & Zero-Noise Policy.**
   Refined the global header selector (`HeaderChannelSelector.tsx`) and detail page
   ergonomics:
   - **Click-to-Deselect:** Clicking an active system toggles it off (`defaultChannel = null`).
     "Nothing selected" naturally means "Show All Recipes" in the library and defaults to
     the recipe's primary channel on detail pages, eliminating the need for an artificial
     or cluttered "ALL" button.
   - **Elimination of Dual-Selector Conflict:** On recipe detail pages, having both a
     global header selector and an in-page hardware switcher created confusing dual-state
     scenarios. Decision: The in-page channel tabs only render when *no* global coffee is
     selected.
   - **Rejection of the "Peek" Feature:** Explicitly eliminated a proposed "Peek at Cometeer"
     toggle. StickyMilk's fundamental promise is *"the recipe for the coffee you have."*
     If a user selects Instant or Nespresso, displaying Cometeer recipes or teasers introduces
     unnecessary noise and friction.

5.19. **Multi-Component Culinary Architecture & Workflow Phasing.**
   Analyzing Sofia Hrdz's Cookie Butter Cloud Latte revealed a critical structural pattern:
   the drink consists of distinct sub-assemblies (Cold Foam vs. Latte Base vs. Garnish).
   Addressed this across both ingredients and steps:
   - **Grouped Ingredients:** Activated `Ingredient.group` in `IngredientChecklist.tsx`,
     rendering clean subheadings for each sub-assembly.
   - **Procedural Workflow Phases:** Updated `PreparationSteps.tsx` to parse Markdown
     headers (`## Phase 1: Cookie Butter Cloud Foam`, `## Phase 2: Latte Base Assembly`)
     into styled workflow phase dividers without interrupting step numbering.
   - **Culinary Staging (*Mise en Place*):** Video creators often mix up step order for
     visual rhythm, but practical kitchen physics requires staging: temperature-stable
     elements (cold foam) must be whipped first, becoming an intermediate input ingredient
     ready to top the espresso and ice before the ice melts and dilutes the drink.

5.20. **Cumulative Nutrition Engine & Ingestion Taxonomy Scaling.**
   Verified that `lib/nutrition.ts` accumulates macros linearly across multi-phase
   ingredient lists without deduplication (e.g. milk in cold foam + milk in latte base
   both contribute accurately to totals). Expanded `content/taxonomy/ingredients.json`
   with `cookie_butter` and `biscoff_cookie` and calibrated their macro profiles.
   Formulated ingestion principles for novel ingredients: unmapped ingredients omit
   `item_id` gracefully without breaking UI; Sprint 4 will co-locate nutritional
   benchmarks in taxonomy and apply category-level macro baselines for novel items.

5.21. **The 10-Point Test Kitchen Review System & Coffee-Assigned Promoter Shelf.**
   Addressed the catalog discovery and recommendation challenge (moving beyond alphabetical sorting):
   - **10-Point Unvarnished Review System:** Implemented `TestKitchenReview` on `Recipe`
     (`score`, `verdict`, `notes`, `channel_scores`, `channel_verdicts`, `tested_date`, `tester`).
     Rejects inflated 5-star fluff in favor of culturally resonant 10-point scoring
     paired with blunt, honest craft verdicts (e.g. *"This was too sweet for my liking. I'd recommend half the SCM"*).
   - **Hardware Translation Fidelity Matrix:** Enabled channel-specific scores and verdicts
     (e.g., Cometeer 10.0 vs. Instant 8.5) on `components/TestKitchenReviewCard.tsx`,
     providing radical transparency on how well a recipe translates to each hardware setup.
   - **Coffee-Assigned Promoter Shelf (`components/PromoterShelf.tsx`):** Built a
     Netflix-style horizontal scroll shelf above the library grid. Honors the active
     coffee foundation: when Instant is chosen, the shelf adapts to Instant-compatible drinks
     and displays Instant prep times and scores. When no coffee is active, it spotlights
     viral hits and test kitchen favorites across all three channels.
   - **`★ Top Rated` Library Sorting:** Integrated 10-point score sorting in
     `components/RecipeLibrary.tsx` (`[ ★ TOP RATED | TRENDING | FASTEST BREW | A TO Z ]`).
     Cards display an instant `★ [SCORE]` pill in `components/RecipeCard.tsx`.

5.22. **The Coffee Translator Engine (`TRANSLATE FOR MY COFFEE`) & User-Driven Intake.**
   Confronted the ingestion scaling and intake model. Rejected brittle autonomous
   web scrapers and uninspired "Submit a Recipe" crowdsource forms (which treat
   users like unpaid data-entry workers). Replaced them with the **Coffee Translator**:
   - **The Core CTA:** `[ TRANSLATE FOR MY COFFEE → ]` with subtext:
     *"Paste a TikTok/IG reel and build your recipe here!"*.
   - **High-Intent Ingestion:** A real user brings the video they actually want;
     StickyMilk translates it for their specific counter setup and feeds the vault.
     100% verified demand with zero wasted curation.
   - **The 3 Translation Superpowers:**
     1. *Hardware Translation Layer:* Calculates brew math across Cometeer (26g melt),
        Nespresso Vertuo (40ml/80ml pull), and Specialty Instant (2oz hot bloom).
     2. *Nutritional Reality Check:* Auto-calculates calories, caffeine (mg), and sugar (g)
        with human reference points (*"almost a full day's sugar"*), exposing hidden macros viral videos ignore.
     3. *Culinary Staging Engine (Mise en Place):* Restructures visual-first video cuts
        into temperature-stable kitchen execution (whip cold foam first as an input ingredient; pull hot espresso over ice last).
   - **Dual-Entry Funnel:** Phase 1 implements an internal admin tool at `/admin/import`
     for Tony to rapidly ingest and verify drinks; Phase 2 introduces a public `/translate`
     portal box where visitors request translations and grow the vault.

---

## 6. Known constraints / workarounds worth remembering

- **Local Production Build is Fully Verified:** `next build` completes
  successfully with 0 errors across all 69 static pages. The sandbox font
  limitation is not an issue in local or Vercel builds.
- **`lib/recipes.ts`'s cache is a plain module variable, not a Next.js
  cache.** Restart `next dev` after hand-editing `content/recipes/*.json`
  directly; the New Recipe form and edit actions handle their own cache
  invalidation via `invalidateRecipeCache()`.
- **npm install-scripts:** `@prisma/engines`, `better-sqlite3`, `prisma`,
  and `unrs-resolver` need their install scripts approved once
  (`npm install-scripts approve <pkg>`) before `npm install` succeeds
  cleanly on a fresh clone.

---

## 7. Explicitly deferred / not built (by design, not by accident)

- **Public user accounts & public ratings.** While Prisma models (`User`,
  `Rating`) exist and admin authentication is live, public-facing user
  logins and community ratings are deferred until catalog and search
  reach scale.
- **Image upload pipeline.** The `image` field is a plain text path; the
  workflow remains "drop the image in `public/recipes/` or `public/creators/`,
  enter the path, and commit to git."
- **Real ingredient scaling wired to the new `scaling` field.** The field
  exists on `Ingredient`; currently the scaler multiplies all numerical
  amounts linearly.
- **The `Promo` type / affiliate mechanic.** Exists in `lib/types.ts`,
  unused. Kept as an optional per-recipe property rather than hardcoded.
- **"Counter Barista" / "Dial Me a Drink."** A standalone pantry-matching
  and generative tool. Deferred until the intake and curation workflows
  are fully stabilized.
- **Rich-text "story" layer per recipe.** Stored for future SEO/copyright
  defensibility (`story?: string` Markdown block).

---

## 8. Suggested pipeline from here

Aligned with `ROADMAP_V1.md`:

1. **Sprint 3: Mobile Experience & Production Readiness**
   - Counter Mode View: high-contrast, arm's-length mobile layout with
     large tap targets and readable steps.
   - OpenGraph Social Cards: brutalist preview card generator for iMessage,
     Reddit, and X link sharing.
   - Vercel production deployment hardening.
2. **Sprint 4: The Coffee Translator Engine (`/admin/import` & `/translate`)**
   - User CTA: `[ TRANSLATE FOR MY COFFEE → ]` ("Paste a TikTok/IG reel and build your recipe here!").
   - 3 Translation Superpowers: Hardware brew math, Nutritional reality check (caffeine/sugar), and Culinary staging (*mise en place*).
   - Multi-Component Detection & Phasing: automated breakdown into
     sub-assemblies (Foam, Base, Garnish) with *mise en place* step ordering.
   - Novel Ingredient Fallback & Taxonomy Intake: auto-matching known items
     and applying category-level macro benchmarks for unmapped ingredients.
   - Deterministic QA Gate: hard schema validation before saving to Git.
3. **Post-V1: Relational Database Migration**
   - Migrate flat JSON files into PostgreSQL / Prisma schema when catalog
     size or dynamic multi-user features demand it. Creator-scoped slug
     architecture ensures zero URL churn or collision risk.

---

## 9. Quick reference: adding a recipe today

Two ways, both write to `content/recipes/${creator_slug}-${recipe_name}.json`:

- **The form** (`http://localhost:3000/recipes/new`, dev/admin) — the
  intended path. Validates before writing, checks slug collisions, shows
  a readiness checklist, and lets you preview the real detail page before saving.
- **By hand** — copy the shape from an existing file, ensuring `ingredients`
  carry `group` for multi-component drinks and steps utilize `## Phase N` headers
  for workflow phases. Restart `next dev` after editing.

Always maintain 100% 3-channel parity across Cometeer, Nespresso Vertuo,
and Instant, assigning honest `provenance` badges (`original`, `adapted`,
or `tested`) to each.
