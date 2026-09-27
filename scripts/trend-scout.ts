// Trend scout: finds fast-rising coffee Shorts on YouTube and writes a ranked
// shortlist for a human to approve. It never translates or ingests anything —
// approved links go through /translate as admin.
//
//   npx tsx scripts/trend-scout.ts                 # print markdown shortlist
//   npx tsx scripts/trend-scout.ts --days 7 --top 15 --out shortlist.md
//
// Requires YOUTUBE_API_KEY (YouTube Data API v3, free tier). Quota: each
// query costs ~100 units of the 10,000/day free allowance; the default run
// uses ~800. YouTube is the only platform here with an official search API;
// TikTok/Instagram trends are covered by the weekly routine's web search.
// See TREND_SCOUT.md.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/** One query per coffee type plus the viral-drink vocabulary users actually search. */
export const QUERIES = [
  "iced coffee recipe",
  "cold foam recipe",
  "viral coffee drink",
  "nespresso vertuo recipe",
  "cometeer recipe",
  "instant coffee recipe",
  "whipped coffee",
  "iced latte at home",
];

const COFFEE_TERMS =
  /coffee|latte|espresso|cold foam|cold brew|nespresso|vertuo|cometeer|instant|macchiato|cappuccino|frapp|mocha|dalgona|affogato|americano|cortado|matcha latte/i;
const MAX_SHORT_SECONDS = 180;

export interface Candidate {
  id: string;
  url: string;
  title: string;
  channel: string;
  publishedAt: string;
  views: number;
  likes: number;
  durationSeconds: number;
  viewsPerDay: number;
  matchedQueries: string[];
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    days: Number(get("--days") || 14),
    top: Number(get("--top") || 15),
    out: get("--out"),
  };
}

export function parseIsoDuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/** YouTube video IDs already in the vault, so we never suggest a recipe twice. */
export function vaultYouTubeIds(contentDir = path.join(process.cwd(), "content", "recipes")): Set<string> {
  const ids = new Set<string>();
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".json"))) {
    const url: string | undefined = JSON.parse(readFileSync(path.join(contentDir, file), "utf-8")).source?.url;
    const id = url?.match(/(?:shorts\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

/** The slice of the YouTube Data API v3 response shape we read. */
interface YouTubeItem {
  id: string | { videoId?: string };
  snippet?: { title?: string; description?: string; tags?: string[]; channelTitle?: string; publishedAt: string };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
}

async function youtube(endpoint: string, params: Record<string, string>): Promise<{ items?: YouTubeItem[] }> {
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`);
  if (!res.ok) {
    throw new Error(`YouTube ${endpoint} failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

export async function scout(opts: { days: number; top: number; now?: Date }): Promise<Candidate[]> {
  const now = opts.now ?? new Date();
  const publishedAfter = new Date(now.getTime() - opts.days * 86_400_000).toISOString();

  // 1. Search: collect IDs and which queries surfaced each one
  const hits = new Map<string, Set<string>>();
  for (const q of QUERIES) {
    const data = await youtube("search", {
      part: "id",
      type: "video",
      q,
      videoDuration: "short", // < 4 min; narrowed to Shorts length below
      order: "viewCount",
      publishedAfter,
      regionCode: "US",
      relevanceLanguage: "en",
      maxResults: "25",
    });
    for (const item of data.items ?? []) {
      const id = typeof item.id === "object" ? item.id.videoId : undefined;
      if (!id) continue;
      if (!hits.has(id)) hits.set(id, new Set());
      hits.get(id)!.add(q);
    }
  }

  // 2. Details in batches of 50 (1 quota unit per call)
  const inVault = vaultYouTubeIds();
  const ids = [...hits.keys()].filter((id) => !inVault.has(id));
  const candidates: Candidate[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await youtube("videos", {
      part: "snippet,statistics,contentDetails",
      id: ids.slice(i, i + 50).join(","),
    });
    for (const v of data.items ?? []) {
      if (typeof v.id !== "string" || !v.snippet) continue;
      const title: string = v.snippet?.title ?? "";
      const text = `${title} ${v.snippet?.description ?? ""} ${(v.snippet?.tags ?? []).join(" ")}`;
      const durationSeconds = parseIsoDuration(v.contentDetails?.duration ?? "");
      if (durationSeconds > MAX_SHORT_SECONDS || !COFFEE_TERMS.test(text)) continue;

      const views = Number(v.statistics?.viewCount ?? 0);
      const ageDays = Math.max(0.5, (now.getTime() - Date.parse(v.snippet.publishedAt)) / 86_400_000);
      const id = v.id;
      candidates.push({
        id,
        url: `https://www.youtube.com/shorts/${id}`,
        title,
        channel: v.snippet?.channelTitle ?? "",
        publishedAt: v.snippet.publishedAt,
        views,
        likes: Number(v.statistics?.likeCount ?? 0),
        durationSeconds,
        viewsPerDay: Math.round(views / ageDays),
        matchedQueries: [...(hits.get(id) ?? [])],
      });
    }
  }

  // 3. Rank by momentum (views/day), not lifetime views: we want what's rising now
  return candidates.sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, opts.top);
}

function compact(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);
}

export function toMarkdown(candidates: Candidate[], days: number, now = new Date()): string {
  const lines = [
    `## YouTube Shorts — rising coffee recipes (last ${days} days)`,
    "",
    `Scouted ${now.toISOString().slice(0, 10)}. Ranked by views per day. Already-imported videos are excluded.`,
    "Tick the ones worth translating, then paste each link into /translate while signed in as admin.",
    "",
  ];
  if (candidates.length === 0) {
    lines.push("_No new coffee Shorts matched this week._");
  }
  for (const c of candidates) {
    const likeRate = c.views > 0 ? ` · ${((c.likes / c.views) * 100).toFixed(1)}% likes` : "";
    lines.push(
      `- [ ] **[${c.title.replace(/[[\]]/g, "")}](${c.url})** — ${c.channel}`,
      `  ${compact(c.viewsPerDay)} views/day · ${compact(c.views)} total${likeRate} · ${c.durationSeconds}s · via "${c.matchedQueries.join('", "')}"`
    );
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const { days, top, out } = parseArgs(process.argv.slice(2));
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY is not set. See TREND_SCOUT.md for how to get a free key.");
    process.exit(2);
  }
  const markdown = toMarkdown(await scout({ days, top }), days);
  if (out) {
    writeFileSync(out, markdown, "utf-8");
    console.error(`Wrote ${out}`);
  } else {
    process.stdout.write(markdown);
  }
}

// Run only when executed directly (the test imports the helpers)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
