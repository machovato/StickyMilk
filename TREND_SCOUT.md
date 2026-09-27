# Trend scout

Finds fast-rising coffee Shorts on YouTube and produces a ranked shortlist for
you to approve. It **never ingests anything**: you stay the editor. Approved
links go through `/translate` as admin.

```
npm run scout                       # print the shortlist
npm run scout -- --days 7 --top 20  # tune the window and length
```

- Ranked by **views per day**, not total views, to catch what is rising now.
- Filters: Shorts length (≤ 3 min), coffee vocabulary in title/description/tags,
  and videos already in the vault.
- Queries live in `QUERIES` in `scripts/trend-scout.ts`, one or more per coffee type.

## YouTube API key (free)

1. Google Cloud Console → create a project → enable **YouTube Data API v3**.
2. Credentials → Create credentials → API key. Restrict it to that API.
3. Add `YOUTUBE_API_KEY=...` to `.env` (and to the cloud environment for the weekly routine).

The default run uses ~800 of the 10,000 free daily quota units.

## Why only YouTube?

YouTube is the only one of the three platforms with an official search API
anyone can use. TikTok's Research API is limited to academics, and Instagram's
hashtag search requires a Business account and app review. The weekly routine
covers TikTok and Instagram by searching the web for this week's viral coffee
drinks and listing those links separately, still for you to approve.
