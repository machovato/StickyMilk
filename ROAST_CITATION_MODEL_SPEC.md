# Spec: coffee identity — mandatory vs. recommended vs. citation

Status: built. Reviewed by Gemini (approved, with direct answers to §7 and
one design note on roast-family ranges); Tony independently resolved the
scope of §7 Q3 in conversation before the review (migrate `tested_with`
universally, `roast_recommendation` reserved strictly for genuine
pairing reasons). See §9 for what actually shipped, including one
research note and one pre-existing data-issue this migration resolved.

## 1. Problem

`Preparation.roast?: string` is currently a free-text field, set on all 18
Cometeer preps (Nespresso and Instant never use it). In practice it holds a
specific roaster's blend name — "Intelligentsia Black Cat Classic Espresso,"
"Onyx Southern Weather," "Go Get Em Tiger Chelbesa" — displayed under Recipe
Details as if it were a requirement.

It isn't one. Nobody buying a Cometeer variety box is stocking six capsules
of the same blend, and nobody should read a recipe and conclude they can't
make it because they have the "wrong" brand in the freezer. The field
conflates three genuinely different things: the physical format needed to
make the drink work, a general roast-character suggestion, and a specific
product citation — and only the first one is actually load-bearing.

## 2. Goal

Stop implying a specific roaster/blend is required. Keep the ingredient
list 100% generic. Offer a roast-family nudge only where there's a real,
statable reason one helps. Let a specific product be named only as an
optional citation — never a requirement — with room to promote that
citation to the headline later for a recipe that's deliberately built
around one product (the Premium/Stellar-series case, explicitly out of
scope here — no such recipe exists yet).

## 3. Non-goals

- **Not building the Premium/featured-citation treatment.** Tony has no
  premium-capsule recipes today. When one exists, promoting `tested_with`
  to a headline is a small, separate UI change — not designed here.
- **Not building Counter Barista pantry-matching.** The roast-family value
  this spec adds is what a future "I have X, what can I make" feature
  would filter on, but that feature isn't being built now.
- **Not touching Nespresso or Instant ingredient text**, already fixed in
  the double-shot work — this spec only touches the `roast`/citation
  fields.
- **Not inventing a fourth roast bucket.** Three plain retail terms only:
  Light, Medium, Dark. No compound jargon ("dark_bold," "medium_balanced").

## 4. Data model

Replace `Preparation.roast?: string` with two independent optional fields:

```ts
/** A general roast-family nudge — advisory, never a requirement. Add only
 *  when there's a real, statable flavor reason (see §5). Most preps will
 *  have neither this nor roast_note at all. */
roast_recommendation?: "light" | "medium" | "dark";

/** Why the recommendation helps, in one short phrase — not a tasting-note
 *  essay, not a fabricated flavor description. Required if
 *  roast_recommendation is set (a bucket with no stated reason is exactly
 *  the "arbitrary tag" problem this spec exists to avoid); omit both
 *  together when there's no real reason. */
roast_note?: string;

/** Optional citation — what was actually used when this recipe was
 *  written/tested. Never implies requirement; never validated against
 *  roast_recommendation (a citation can exist without a recommendation,
 *  e.g. a future Premium recipe that skips the advisory tier entirely and
 *  goes straight to "this recipe is built around this specific capsule"). */
tested_with?: string;
```

Validation (`recipe-schema.ts`): `roast_recommendation`, if present, must be
one of the three literals; `roast_note` required whenever
`roast_recommendation` is set (and only then — no roast_note without a
recommendation, since it'd have nothing to explain); `tested_with` is a
free string, independent of the other two.

## 5. Backfill methodology — the part that actually matters

This is not "convert every `roast` string into a bucket." Per recipe, the
question is: **is there a genuine, statable flavor-pairing reason a roast
family helps here** — not "what roast happened to be used." Two outcomes:

- **A real reason exists** → set `roast_recommendation` + a one-line
  `roast_note` stating the reason (e.g., cà phê sữa đá: dark, because a
  light/fruity roast reads as sour against sweetened condensed milk — this
  is stock knowledge about how acidity and lactose interact, not invented
  per-recipe).
- **No statable reason** → set neither field. A latte or mixed drink where
  milk or other ingredients dominate the flavor almost certainly falls
  here. Expect most of the 18 recipes to land in this bucket — that's the
  point, not a shortfall.

`tested_with` is handled separately and more loosely: the current `roast`
string can be carried over directly into `tested_with` for any recipe that
had one, since it's just a citation of what was actually used — no
judgment call needed there, only for `roast_recommendation`.

I have general knowledge about some of these roasters' profiles (e.g.,
Ethiopian single-origins like "Chelbesa" skew light/bright; "French Roast"
is unambiguously dark) but haven't verified any of it against a source
this session. Before backfilling `roast_recommendation` anywhere, I'll
either confirm the profile via a real source or ask Tony directly — never
infer a bucket from a blend name alone.

## 6. Where it renders

`RecipeDetail.tsx`, Recipe Details section, replacing the current single
`Roast` row:

- `roast_recommendation` present → a row: `Roast` / `Dark` (or
  Light/Medium), with `roast_note` as small supporting text underneath —
  worded as a nudge ("works best with," not "requires").
- `tested_with` present → a separate, clearly secondary line, e.g. "Tested
  with: Intelligentsia Black Cat Classic Espresso" — footnote-weight, not
  competing visually with the recommendation row.
- Neither present → the whole roast area is omitted, same as any other
  optional Recipe Details field today.

Ingredient list itself is untouched — already generic ("Cometeer capsule,"
etc.) for the channels this spec covers.

## 7. Open questions

1. Field names OK as drafted (`roast_recommendation`, `roast_note`,
   `tested_with`), or prefer different ones?
2. Should `tested_with` also be offered on Nespresso/Instant preps (a
   Nespresso recipe naming which real pod was used), or Cometeer-only for
   now, matching where the old `roast` field already lived?
3. OK with dropping the roast line entirely on recipes where no real
   pairing reason exists, even though that's most of them — or is there
   value in still carrying the old blend name forward as `tested_with`
   everywhere it existed, even without a recommendation?

## 8. Implementation footprint (once approved)

- `lib/types.ts` — `Preparation.roast` → the three fields above.
- `lib/recipe-schema.ts` — replace the `roast` string check with
  validation for the three new fields.
- `lib/write-recipe.ts` — key order swap.
- `lib/recipe-draft.ts`, `components/recipe-form/PreparationEditor.tsx` —
  replace the single free-text Roast input with a Light/Medium/Dark
  select (optional), a short reason field shown only when a level is
  picked, and a separate "Tested with" free-text field.
- `components/RecipeDetail.tsx` — render per §6.
- `content/recipes/*.json` — per-recipe backfill per §5, for the 18
  Cometeer preps that currently have `roast` set.

## 9. What actually shipped

**`roast_recommendation` set on 6 of 18** — cà phê sữa đá, cà phê sữa
nóng (phin-style), and sticky latte (condensed-milk/acidity clash, dark);
grapefruit coffee tonic and layered coffee tonic (citrus/tonic pairing,
light); black cat affogato and both tiramisu recipes (needs boldness to
stand up to cold gelato / sweet mascarpone — a well-established
convention, not a stretch). The other 12 — including both espresso
martinis, where "needs to read through vodka and coffee liqueur" was a
real but weaker argument — got neither field, on the conservative side
per Gemini's "reserve strictly" framing.

**`tested_with` migrated on all 18**, mostly a straight carry-over of the
old `roast` string — with one exception: `one-bowl-mocha-skillet-cookie`
previously carried a flagged `data_issue` (its `roast` field said
"Equator Mocha Java," a full-caf roast, while `caffeine_level` was
"half" — an unresolved mismatch from an earlier session). The ingredient
notes already named the actual half-caf pick ("Birch Coffee Half Day
Dark Half Caff"). Using that for `tested_with` instead of carrying the
stale value forward resolves the mismatch, so the `data_issues` entry
was removed rather than migrated too.

**One honesty note on the backfill itself:** the `roast_recommendation`
reasoning above is mine, built from general coffee knowledge (e.g. that
sweetened condensed milk can read as clashing against a bright, acidic
roast) rather than a source checked this session. It's flagged here, not
buried, per §5's own rule — worth a skim before treating any of the six
as settled.
