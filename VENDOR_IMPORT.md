# Vendor recipe import

Seeds the vault with official Nespresso and Cometeer recipes, translated to all
three coffee types (Cometeer, Nespresso, Instant).

## Two ways in

- **One at a time:** paste a Nespresso or Cometeer recipe URL into `/translate`
  while signed in as admin. It lands in the vault as `needs_testing`.
- **In bulk:** list URLs in `seed/vendor-urls.txt`, then
  ```
  npm run import:vendor -- --file seed/vendor-urls.txt --dry-run
  npm run import:vendor -- --file seed/vendor-urls.txt
  ```
  URLs already in the vault are skipped, so the list can grow over time and be re-run.

Set `GEMINI_API_KEY` in `.env` for the full import. Without it, only pages with
schema.org recipe data import, with coarser results and no method steps.

## What gets stored, and what doesn't

| | Stored | Why |
|---|---|---|
| Ingredients and amounts | ✅ exactly as published | Facts, not creative expression |
| Which capsule, how many, brew volume | ✅ on the vendor's own channel | That channel is marked `provenance: original` |
| Method | ✅ **rewritten in our words** by Gemini | Vendor wording is copyrighted; we keep the technique, not the sentences |
| Vendor photos | ❌ never | Copyrighted; recipes use the stylized placeholder until we shoot our own |
| Source link | ✅ `source.type: "vendor"` + URL | Credit and traceability |

The vendor's channel keeps its exact recipe. The other two channels are
**adapted** by the translator and need kitchen testing. Known gap: adapted
channels don't yet scale coffee strength (a 2-capsule Cometeer recipe still
maps to one Nespresso double). That's the brew-math engine on the roadmap.

## When a vendor blocks the fetch

Vendor sites often block server requests. Then:
- **In `/translate`:** open the page in your browser, select all, copy, and paste
  it into the caption box along with the URL.
- **In bulk:** save the page ("Save Page As…" → HTML) into `seed/pages/` and
  write `URL | pages/that-file.html` in the list.

## How extraction works

1. Fetch the page, or use the pasted/saved copy.
2. Look for schema.org `Recipe` JSON-LD (exact, structured).
3. Gemini reads the JSON-LD (or the page text) and returns a fixed-shape recipe:
   the capsule separated from the other ingredients, and the method in our words.
4. Synthesis builds all three channels; the vendor's channel is overridden with
   the vendor's exact coffee.

Code: `lib/translator/vendor-extractor.ts`, `lib/translator/ingest.ts`,
`scripts/import-vendor.ts`.
