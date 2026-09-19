# New Recipe Form — Design Spec

`/recipes/new` — a local-only authoring tool that writes directly to
`content/recipes/${slug}.json`. Not a production feature: it's how you (the
only user) add recipes without hand-writing JSON.

## Why this shape

- **Server Action, not an API route.** Progressive enhancement, no client
  fetch plumbing, and it's the idiomatic Next.js 16 way to mutate
  filesystem state from a form.
- **One JSON blob in, not dozens of indexed fields.** The form is a client
  component holding a single object shaped exactly like `Recipe` (arrays of
  preparations/ingredients/steps included). On submit it serializes that
  object into one hidden input; the Server Action `JSON.parse`s it. This
  avoids parsing `preparations[0].ingredients[2].amount`-style field names
  by hand.
- **Reuse `lib/recipes.ts`'s validation, don't duplicate it.** That file
  already has a `validate()` that enforces every rule the reader depends
  on (slug/filename match, required fields, ingredient shape, etc.). Pull
  it out into `lib/validate-recipe.ts` so both the reader and the writer
  enforce identical rules — a recipe the form accepts is *guaranteed* to
  load on the detail page, by construction, not by hoping the two stay in
  sync.
- **Single-page sectioned form, not a wizard.** You know the schema; a
  multi-step wizard adds navigation complexity for a form only one person
  uses. Sections mirror the JSON structure top to bottom: recipe basics →
  preparations (one block per enabled channel) → review.

## Gating (important)

This route must not exist in production. Vercel's serverless functions
have a **read-only filesystem** except `/tmp` — a write to
`content/recipes/` in a deployed function would either throw or silently
vanish on the next cold start, and either way nothing persists. Gate the
page and the action:

```ts
if (process.env.NODE_ENV === "production") notFound();
```

Saving writes a local file; it does **not** commit or push. The form
should say so explicitly after a successful save ("Saved locally — commit
and push when you're ready to deploy this recipe"). Git stays a manual,
human step — I'd rather you review the diff than have the tool commit
content changes on your behalf.

## Fields

### Recipe basics
| Field | Control | Notes |
|---|---|---|
| Name | text, required | |
| Slug | text, auto-generated from name (editable) | slugify + collision check against existing `content/recipes/*.json`; block save on collision |
| Format | select, required | from `FORMAT_LABELS` — single source of vocabulary with the detail page |
| Flavor notes | textarea, required | |
| Status | select, defaults to `draft` | you can't mark `verified` from a form you just filled out — that's earned by actually making the drink |
| Sweetness level | select, required | from `SWEETNESS_LABELS` |
| Tags | tag input (add/remove chips), optional | free text, lowercase-and-dash normalized to match existing tag style |

### Preparations
Checkbox row: **Cometeer / Nespresso / Instant** — ticking one reveals its
block. At least one required. Each enabled channel gets:

| Field | Control | Notes |
|---|---|---|
| Roast | text, Cometeer only | |
| Capsule count | number, Cometeer only | |
| Caffeine level | select | full / half / decaf |
| Difficulty | select | easy / medium / advanced |
| Prep time (min) | number | |
| Servings | number | |
| Equipment | tag input, optional | |
| Dietary | multi-select, optional | from `DIETARY_LABELS` |
| Ingredients | repeatable row: amount (number, optional) · unit (text, optional) · item (text, required) · notes (text, optional) | add/remove/move-up/move-down, no drag-and-drop library |
| Steps | repeatable textarea | add/remove/move-up/move-down |

### Not in v1 (flagging, not deciding for you)
- **Image upload.** No upload pipeline exists yet. v1 is a plain text
  input for a relative path (you drop the file in `public/recipes/`
  yourself and type the path) — same as how `image` already works for the
  two recipes that might eventually get one.
- **Editing existing recipes.** This spec is create-only. Editing needs
  prefill-from-file plus a decision about what happens to a slug rename
  (rename = delete-old-file-and-write-new, which is destructive). I'd
  build create-only first, confirm the shape feels right, then add
  `/recipes/[slug]/edit` as a thin wrapper around the same form component.
- **`data_issues`.** That field exists to flag real contradictions found
  in messy source data (the Tiramisu bug). It shouldn't be a form field —
  keep it a manual, deliberate edit.

## Save flow

1. Client validates required fields inline (HTML5 `required` +
   a few custom checks: at least one preparation, at least one ingredient
   per enabled preparation, at least one step per enabled preparation).
2. Submit → Server Action → `validate-recipe.ts` (same rules `lib/recipes.ts`
   already enforces) → on failure, return field-level errors, don't write
   anything.
3. On success: pretty-print JSON (2-space indent, trailing newline —
   matches existing files so `git diff` stays clean), write to
   `content/recipes/${slug}.json`, clear `lib/recipes.ts`'s in-memory
   cache so the new recipe shows up without a dev-server restart, redirect
   to `/recipes/${slug}`.

## Open questions (my recommendation, but your call)

1. **Create-only v1 vs. building edit at the same time?** Recommend
   create-only — smaller surface, and you'll want to adjust the form once
   you've actually used it once.
2. **Tag/equipment vocabulary — free text or a fixed list?** Recommend
   free text for now (14 recipes isn't enough data to know the right fixed
   taxonomy yet); revisit once you've got 30+ recipes and can see which
   tags actually repeat.
3. **Should the cache-clear be automatic, or should the redirect just rely
   on `revalidatePath`?** Recommend `revalidatePath("/", "layout")` from
   the Server Action over hand-rolling a cache-bust export — it's the
   built-in Next.js primitive for exactly this and needs no new API
   surface on `lib/recipes.ts`.
