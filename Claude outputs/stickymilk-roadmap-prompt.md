Act as a Principal Product Architect and Solo Founder Advisor.

I'm building StickyMilk, a specialty coffee web app translating drink concepts across three brew channels: Cometeer (frozen extract), Nespresso Vertuo (single pod), and Instant coffee (freeze-dried), specializing in condensed milk chemistry and accelerated extraction without traditional phin hardware.

Current Verified Baseline:
- Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma 7 + SQLite (for future User/Rating; unhooked from UI).
- Data Architecture: Editorial content lives as git-versioned JSON in `content/recipes/*.json`, verified against candidate schemas and an ingredient taxonomy (`content/taxonomy/ingredients.json`).
- Environment Constraint: Sandboxed build environment currently has network restrictions fetching Google Fonts during `next build`.
- 18 Kitchen-Tested Recipes: Strict editorial integrity (empty state rendered if a preparation doesn't exist; zero fabricated drinks).
- Live Features in Code:
  * 3-tier coffee identity model (mandatory format/ratio, recommended roast requiring stated culinary rationale, citation).
  * Method Selector and Barista Diff channel comparison.
  * Ingredient scaling (0.5x, 1x, 2x, 4x) supporting proportional `secondary_amount` units (g/ml).
  * Dynamic Nespresso Vertuo double-shot equivalence tip on even pod counts >= 2.
  * Live Extraction Chronometer built into recipe detail.
  * Create-only, dev-gated New Recipe form (`/recipes/new`) writing directly to local disk.
  * "StickyMilk Lab // Archive" brutalist UI (Syne, Be Vietnam Pro, JetBrains Mono; espresso/cream base with electric blue and lime accents).
- Explicitly NOT Built:
  * Auth / `/admin` area.
  * Recipe editing (`/recipes/[slug]/edit`).
  * Image upload pipeline (currently manual file drops into `public/recipes/`).
  * Rich-text/Markdown "story" field.
  * "Counter Barista" standalone pantry matcher.
  * Ratings/reviews UI.
  * Promo/affiliate engine.
  * Public production deployment.

I am shipping this as a solo developer. Do not force enterprise ceremony, bloated agile rituals, or 10-person team overhead.

Generate a pragmatic Product Development Roadmap from this exact baseline to a public v1.0 release:

0. Immediate Next Actions:
   - Before the phased plan, list the 1-2 concrete things to do THIS WEEK — the actual next steps from today's baseline, not the start of a multi-week phase.

1. Solo-Developer Phases (from Hardening → Public v1.0 Launch):
   - Sequence strictly by DEPENDENCY ("what blocks what"), not a feature wishlist.
   - For each phase, break work into 4 practical workstreams:
     * Design / UX
     * Engineering / Architecture
     * Content / Editorial
     * Infra / Ops
   - Establish explicit, binary EXIT GATES (Pass/Fail criteria across Tech, Content, and UX) required to unlock the next phase.
   - For each phase, give a relative effort size (S/M/L/XL, or sprint-count equivalent) for a solo developer — not to schedule against a calendar, but to make trade-offs visible when deciding what to tackle first.

2. The v1.0 Cut Line:
   - Explicitly separate what MUST exist before any public launch from what is safe to defer to v1.1+. Solo projects scope-creep easily — call out anything in the current feature list or backlog that sounds necessary but isn't actually blocking a public v1.0.

3. Critical Architectural & Product Decision Forks:
   - The Vercel Serverless File System Trap: Next.js Server Actions writing to local JSON will throw runtime errors on Vercel's read-only filesystem. Evaluate the leanest solo-dev paths (authoring locally + git-push vs. GitHub Commit API vs. migrating recipes into SQLite/Postgres) and recommend the best timing for v1.0.
   - Authoring & Auth: When does auth become a hard blocker vs. keeping authoring local-only?
   - IP / Legal Layer: When and how to introduce the recipe Markdown "story" field for copyright protection (functional recipe steps are not copyrightable; narrative expression is) and organic SEO.
   - Counter Barista: What are the exact structural prerequisites (recipe dairy/flavor facets, structured JSON LLM output) before building this?

4. Known Ambiguities & Blockers:
   - Identify any hidden gaps, unmade decisions, or architectural contradictions in the current state that will stall progress if not resolved upfront.

Deliver this in crisp, structured Markdown, prioritizing execution clarity over abstract theory.
