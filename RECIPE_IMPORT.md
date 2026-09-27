# Recipe page import

Seeds the vault from recipe web pages, translated to all three coffee types
(Cometeer, Nespresso, Instant):

- **Vendor pages** (Nespresso, Cometeer): the vendor's own machine keeps the
  vendor's exact recipe.
- **Any other recipe site** (WordPress coffee blogs, etc.): the coffee base
  ("2 shots espresso", "1 cup cold brew", "2 tsp instant") is translated to all
  three machines.

Social videos (TikTok, Instagram, YouTube) keep using the video pipeline.

## Two ways in

- **One at a time:** paste the page URL into `/translate` while signed in as admin.
  It lands in the vault as `needs_testing`. Visitors who aren't signed in get a preview only.
- **In bulk:** list URLs in `seed/recipe-urls.txt`, then
  ```
  npm run import:recipes -- --file seed/recipe-urls.txt --dry-run
  npm run import:recipes -- --file seed/recipe-urls.txt
  ```
  URLs already in the vault are skipped, so the list can grow and be re-run.

Set `GEMINI_API_KEY` in `.env` for the full import. Without it, only pages with
a structured recipe card import, with coarser results and no method steps.

## What gets stored, and what doesn't

| | Stored | Why |
|---|---|---|
| Ingredients and amounts | ✅ exactly as published | Facts, not creative expression |
| The coffee base | ✅ vendor capsule on the vendor's channel; translated elsewhere | |
| Method | ✅ **rewritten in our words** by Gemini | Published wording is copyrighted; we keep the technique, not the sentences |
| Photos | ❌ never | Copyrighted, and food bloggers enforce this; placeholders until we shoot our own |
| Credit | ✅ author + site name + link | Vendors: `source.type "vendor"`. Blogs: `source.type "creator"`, `platform` = site name, tag `web-find` |

Only **coffee drinks** are imported. Coffee desserts, food, and drinks without
coffee are rejected. Known gap: the translated machines scale strength only
coarsely (shot equivalents: Vertuo double or Cometeer capsule ≈ 2 shots, 1 tsp
instant ≈ ½ shot, ~120 ml brewed or cold brew ≈ 1 shot). The brew-math engine
on the roadmap replaces this.

## When a site blocks the fetch

Many sites block server requests. Then:
- **In `/translate`:** open the page in your browser, select all, copy, and paste
  it into the caption box along with the URL.
- **In bulk:** save the page ("Save Page As…" → HTML) into `seed/pages/` and
  write `URL | pages/that-file.html` in the list.

## How extraction works

1. Fetch the page through `lib/safe-fetch.ts`, which refuses private and
   cloud-metadata addresses (SSRF), re-checks every redirect, and caps the size.
   Or use the pasted/saved copy.
2. Look for a schema.org `Recipe` card (JSON-LD). Most WordPress recipe plugins emit one.
3. Gemini reads the card (or the page text) and returns a fixed-shape recipe:
   the coffee base separated from the other ingredients, and the method in our words.
4. Synthesis builds all three channels.

Code: `lib/translator/recipe-page-extractor.ts`, `lib/safe-fetch.ts`,
`lib/translator/ingest.ts`, `scripts/import-recipes.ts`.
Tests: `npm run test:import`.
