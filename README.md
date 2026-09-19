# StickyMilk

A multi-channel coffee recipe library. A recipe (the drink — name, format,
flavor notes, tags, sweetness) is separate from its preparations (how to
actually make it on a given channel: Cometeer, Nespresso, or instant). See
`SEED_NOTES.md` for the history and caveats on the 14 seeded recipes.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Recipe/preparation/promo content: JSON files in `content/recipes/` — this
  is curated editorial content, not user data, so it isn't in the database
- Prisma 7 + SQLite for the one relational bit (`User`, `Rating`) — schema is
  written to be Postgres-compatible, so switching later is a provider change
  in `prisma/schema.prisma` + swapping the driver adapter in `lib/prisma.ts`
  (e.g. `@prisma/adapter-pg` instead of `@prisma/adapter-better-sqlite3`), no
  changes to any query code
- No auth, no hosting — pure localhost MVP

> **Prisma 7 note:** connection URLs no longer live in `schema.prisma`. The
> CLI (`db:push`, `db:studio`) gets `DATABASE_URL` via `prisma.config.ts`;
> the running app gets it via the driver adapter constructed in
> `lib/prisma.ts`. Both read the same `.env`. If you haven't touched Prisma
> since before mid-2025 this is new — see the error message's link
> (`pris.ly/d/prisma7-client-config`) if you want the full story.

## Setup

```bash
npm install          # also runs `prisma generate` via postinstall
npm run db:push       # creates prisma/dev.db from prisma/schema.prisma
npm run dev
```

Then open http://localhost:3000.

> **Note on `next/font/google`:** the layout uses Geist via Google Fonts,
> which needs a normal internet connection the first time you build/run —
> if you're offline or behind a restrictive proxy, swap `next/font/google`
> for `next/font/local` in `app/layout.tsx`.

## Where things live

- `content/recipes/*.json` — one file per recipe (Recipe + its Preparations).
  Ingredients are structured objects (`{ amount?, unit?, item, notes? }`),
  not plain strings — `amount` is a decimal (0.5, 0.333…) so the portion
  scaler can multiply it; items with no real quantity ("Ice") omit it.
- `lib/types.ts` — the Recipe/Preparation/Promo/Channel/Ingredient types
- `lib/recipes.ts` — reads `content/recipes/` at request time (server-only),
  validates every file's shape and fails with a specific, file-named error
  rather than crashing deep in a component
- `lib/format-amount.ts` — turns a scaled decimal amount back into kitchen
  units ("1/2", "1 1/3") for the portion scaler
- `lib/channel-context.tsx` — the anonymous-visitor default-channel store
  (localStorage-backed today; swapping in `User.default_channel` for
  registered users later is a one-file change)
- `prisma/schema.prisma` — `User` + `Rating` only; recipes are never in here
- `scripts/convert-seed.mjs` — one-time conversion of the two raw seed
  batches into `content/recipes/`; stale now (see its header comment), kept
  only as a record of where the original 16 came from
- `scripts/backfill-metadata.mjs` — one-time backfill of `tags` and
  `sweetness_level` onto the recipes that predated those fields; also stale
  once run, kept for reference

## Recipe page

Each recipe has a hero image (falls back to a format-colored placeholder
card when `image` is unset — true for all 14 seed recipes right now), a
0.5x/1x/2x portion scaler that multiplies ingredient amounts and the
displayed servings count, checkable ingredients (state resets when you
switch channels, since that's a different ingredient list — not when you
change the scale), and equipment/dietary badges per preparation.

## Not built yet (by design)

Auth, the ratings UI, the promo system, and a recipe-authoring form aren't
wired up — the schema and types allow for them, but the MVP is just the
browsable, channel-aware recipe library with faceted filtering (mood/tags,
format, sweetness, caffeine, difficulty, roast, prep time) and the
Cometeer/Nespresso/instant toggle. Only two recipes (`ca-phe-sua-da`,
`vanilla-oat-latte`) have Nespresso/instant preparations written; the rest
are Cometeer-only and show "not yet written for this channel."
