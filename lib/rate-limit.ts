import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 *
 * Stopgap only: state lives in one server process, so on serverless each
 * instance keeps its own counters and a cold start resets them. It stops a
 * single browser tab or script from hammering paid Gemini calls in dev and on
 * a single-instance host. Swap for a shared store (e.g. Upstash Ratelimit)
 * before a public launch on Vercel.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}
