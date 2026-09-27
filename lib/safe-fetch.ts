import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetches a user-supplied public web page without letting the URL reach the
 * server's own network (SSRF): cloud metadata (169.254.169.254), localhost,
 * private ranges. Every redirect hop is re-checked, and the body is capped.
 *
 * Residual risk: DNS can change between our lookup and fetch's own lookup
 * (rebinding). Closing that needs a pinned-IP agent; for a recipe importer
 * behind a rate limit this check is the proportionate guard.
 */

const MAX_REDIRECTS = 5;
const MAX_BYTES = 3 * 1024 * 1024;

export type SafeFetchResult = { ok: true; html: string; finalUrl: string } | { ok: false; reason: string };

export async function safeFetchPage(
  url: string,
  init: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<SafeFetchResult> {
  let current = url;
  const deadline = AbortSignal.timeout(init.timeoutMs ?? 20_000);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const blocked = await checkPublicUrl(current);
      if (blocked) return { ok: false, reason: blocked };

      const res = await fetch(current, { headers: init.headers, redirect: "manual", signal: deadline });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { ok: false, reason: `HTTP ${res.status} without a redirect target` };
        current = new URL(location, current).toString();
        continue;
      }
      if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

      const type = res.headers.get("content-type") || "";
      if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
        return { ok: false, reason: `not a web page (${type.split(";")[0]})` };
      }
      const html = await readCapped(res);
      return { ok: true, html, finalUrl: current };
    }
    return { ok: false, reason: "too many redirects" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "network error" };
  }
}

/** Returns a reason string when the URL must not be fetched, else null. */
export async function checkPublicUrl(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "invalid URL";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "only http(s) links are supported";
  if (url.username || url.password) return "links with credentials are not supported";
  if (url.port && url.port !== "80" && url.port !== "443") return "non-standard ports are not supported";

  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    if (!host.includes(".") || /\.(local|internal|localhost)$/i.test(host)) return "private host";
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      return "host not found";
    }
  }
  return addresses.some(isPrivateAddress) ? "private network address" : null;
}

export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivateAddress(mapped[1]);

  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast, reserved, broadcast
    );
  }

  const v6 = ip.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    /^f[cd]/.test(v6) || // unique local fc00::/7
    /^fe[89ab]/.test(v6) || // link-local fe80::/10
    /^ff/.test(v6) // multicast
  );
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break; // recipe cards and JSON-LD sit near the top; a truncated page is still useful
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
