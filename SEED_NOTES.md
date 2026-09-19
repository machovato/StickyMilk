# Seed content notes

The 14 recipes in `content/recipes/` started as two AI-generated batches (16
recipes total) and went through one consolidation pass. History:

## Consolidation (16 → 14)

The two batches had five overlapping pairs. Two were true duplicates and got
merged; the other three looked like duplicates on the surface but actually
differ in ingredients, caffeine, or technique, so they were kept as distinct
recipes:

- **Merged**: the two "iced Vietnamese coffee" recipes (near-identical
  ratios and steps) → one `ca-phe-sua-da`. The *hot* version
  (`ca-phe-sua-nong-phin-style-no-phin`) is a different format and stayed.
- **Merged**: the two affogato recipes (same roast, same caffeine, one was a
  simplified subset of the other) → `black-cat-affogato`.
- **Kept both**: the two coffee-tonic recipes — one uses grapefruit juice,
  the other is plain tonic + lemon peel. Different drinks.
- **Kept both**: the two espresso-martini recipes — one is shaken with a
  melted decaf capsule (single serving), the other blends *frozen* half-caf
  pucks directly, unmelted, for two servings. Different technique.
- **Kept both**: the two tiramisu recipes — one is a decaf 4-serving dish,
  the other is full-caf individual cups. Different caffeine and format.

## Tiramisu data bug — resolved

`four-serving-cometeer-tiramisu`'s `roast` field used to say "Equator Mocha
Java" (a full-caf roast) while its ingredients/`caffeine_level` described a
Decaf Black Cat Espresso capsule — a real contradiction in the source data,
previously flagged in a `data_issues` field. Standardized on the
ingredients/caffeine_level side (Decaf Black Cat Espresso); the flag is
cleared now that it's internally consistent.

## Hero channel preparations

`ca-phe-sua-da` and `vanilla-oat-latte` (renamed from
`vanilla-oat-cometeer-latte` — it's no longer Cometeer-only) now have full
Nespresso and instant-coffee preparations, not just Cometeer, so the channel
toggle actually swaps a complete instruction set on these two. Every other
recipe is still Cometeer-only — not fabricated, just not written yet;
that's still surfaced as "not yet written for this channel" rather than a
guess.

## Other seed caveats (still apply)

- **Every recipe still seeds with `status: "draft"`.** None have been
  taste-tested, including the newly-added Nespresso/instant preparations
  above, which are unit conversions, not kitchen-tested amounts.
- **Roast/product names are unverified against Cometeer's actual current
  lineup.**
- **`flavor_notes` provenance differs by batch** — batch 1 had editorial
  intro lines to draw from; batch 2's were written from the ingredients/name
  alone. Worth a copy pass before launch.
- **`tags` and `sweetness_level` were assigned editorially** (not sourced
  from either batch) when those fields were added — reasonable first-pass
  categorization, but treat them as draft the same way the recipes are.
