# Spec: Nespresso double-shot equivalence at scaled portions

Status: built. Reviewed twice (once by Tony pasting a Gemini review) before
implementation; both catches from that review were independently verified
against the codebase and fixed here — see §8.

## 1. Problem

`ca-phe-sua-da`'s Nespresso preparation (and every other Nespresso prep
that uses the standard single-shot pod) treats the pod as a plain
discrete ingredient: `amount: 1, unit: "pod"`. At 2x it correctly scales
to "2 pod" — but that's only one of two real ways to actually brew that
much coffee. A Vertuo owner can instead use one real "Double Espresso"
pod (Chiaro, Scuro, Dolce — an actual Nespresso product line, ~80 ml,
roughly double the coffee dose, not just more water) instead of pulling
two separate 40 ml shots. The app currently has no way to tell them that.

This is not a data bug (the pod count is correct) and not a repeat of the
`secondary_amount` fix (that solved a number going stale in text; this is
missing information, not wrong information). It's a gap: a real brewing
alternative that only exists once you've scaled past 1x, and only for
Vertuo machines specifically — OriginalLine has no equivalent "double"
capsule at any dose, so for Original, 2 pods is genuinely the only way.

## 2. Goal

When a scaled Nespresso prep needs 2 or more of the standard single-shot
pod, surface — once, unobtrusively — that an equivalent number of real
Double Espresso pods is a valid substitute. Vertuo owners get a genuinely
useful tip; everyone else (Original owners, anyone at 1x) sees nothing
new.

## 3. Non-goals

- **Not touching `steps` text.** The brewing instructions stay exactly as
  authored. This is a supplementary info line, not a rewrite of the
  recipe's own words — the earlier idea of scale-aware step text is a
  separate, bigger piece that's explicitly on hold.
- **Not adding anything for OriginalLine.** There's no real "double" pod
  for Original to mention — saying nothing is more honest than inventing
  an equivalent that doesn't exist.
- **No new schema.** `item_id` already existed on `Ingredient` — this
  feature needed a recipe-data backfill (§8), not a schema change.
- **Not generalizing to every possible multi-unit ingredient.** Scoped
  specifically to the one real-world case that exists today (the
  Nespresso single-shot pod). If a future recipe needs something similar
  for a different ingredient, that's a separate call when it comes up —
  not solved speculatively now.

## 4. Logic

Gated tightly so it can never say something false:

```
show tip when:
  channel === "nespresso"
  AND prep has an ingredient with item_id === "nespresso_pod"
  AND scaledPodCount = ingredient.amount * scale
  AND scaledPodCount is a whole number
  AND scaledPodCount >= 2
  AND scaledPodCount is even   // can't make a whole number of doubles otherwise
```

`doublePodCount = scaledPodCount / 2`.

This generalizes past the "2x only" version in the original proposal —
at 4x (4 pods), it says 2 Double Espresso pods; at 2x, 1. An odd scaled
count (e.g. a future recipe using 3 pods at 1x, scaled 1x) shows nothing,
since there's no clean "half a double" to offer — silence is correct
there, not a bug to work around.

`item_id === "nespresso_pod"` is the gate, not `channel === "nespresso"`
alone — so a future Nespresso ingredient that isn't the standard single
shot (a Vertuo Gran Lungo pod used directly, say) doesn't trigger a tip
that doesn't apply to it.

## 5. Where it shows up

One location for v1, deliberately minimal:

**Dynamic tip under the portion scaler**, next to the existing
`"{scale}x batch — ingredient amounts and yield below are scaled
accordingly."` line — same spot, same visual weight, shown only when the
conditions above are met:

> 💡 Vertuo tip: {doublePodCount} Double Espresso pod{s} works the same
> as {scaledPodCount} single pods here.

(No ml figure — see §8.)

Not proposing the second location from the original idea (a permanent
line under Barista Diff / Recipe Details) for v1 — that would show even
at 1x, where there's nothing to substitute yet, and adds a permanent UI
element for a fact that's only relevant sometimes. Easy to add later if
it turns out people want it standing.

## 6. Open questions — resolved

1. Wording kept as drafted.
2. Gating stays strictly on `item_id === "nespresso_pod"` — resolved by
   fixing the underlying data gap (§8) rather than relaxing the gate, so
   every recipe using that pod is covered on its actual merits.
3. Dropped the `~80 ml` figure entirely — the tip states pod counts only,
   nothing not already in this app's own data.
4. No permanent Barista Diff line for v1 — dynamic tip only.

## 7. Implementation footprint

- `components/RecipeDetail.tsx` — `nespressoPod`/`scaledPodCount`/
  `doublePodCount` derived next to the `prep` lookup; conditional tip
  line rendered under the existing scale-note paragraph.
- `content/taxonomy/ingredients.json` — added `"Nespresso Original
  espresso"` as an alias on the `nespresso_pod` entry (see §8).
- `content/recipes/classic-hot-latte.json`,
  `classic-iced-latte.json`, `maple-cinnamon-latte.json`,
  `sticky-latte.json` — backfilled `item_id: "nespresso_pod"` on the
  Nespresso pod ingredient line.

## 8. Review findings (verified independently, not taken on faith)

Tony relayed a Gemini review of this spec's first draft claiming two
issues. Both were checked directly against the repo before anything was
changed — the session's standing practice for any pasted third-party AI
report:

1. **Item_id gap — confirmed.** Only 2 of the 6 Nespresso recipes
   (`ca-phe-sua-da`, `vanilla-oat-latte`) had `item_id: "nespresso_pod"`
   set. The other 4 used the text "Nespresso Original espresso," which
   never matched the taxonomy entry's name or (empty) alias list during
   the earlier taxonomy backfill — correct behavior for an exact-match
   backfill, but it left those 4 recipes ungated for this feature.
   Fixed at the root: added "Nespresso Original espresso" as a taxonomy
   alias and backfilled `item_id` on all 4 recipes, rather than loosening
   the code's gating condition.
2. **Hardcoded "(≈80 ml)" — confirmed.** The draft's tip template stated
   a fixed "(≈80 ml)" regardless of `doublePodCount`, which would read as
   80 ml total even at 4x (2 double pods ≈ 160 ml). Fixed by dropping the
   ml figure from the tip (also resolves open question 3).
