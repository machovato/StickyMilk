// Batch-import official vendor recipes (Nespresso, Cometeer) into the vault.
//
//   npx tsx scripts/import-vendor.ts <url> [<url> ...]
//   npx tsx scripts/import-vendor.ts --file seed/vendor-urls.txt [--dry-run]
//
// List file: one URL per line; blank lines and # comments are ignored. When a
// vendor blocks automated fetches, save the page from your browser ("Save Page
// As…" → HTML, or copy the page text into a .txt) and point at it:
//   https://www.nespresso.com/recipes/us/en/22687NES-nespresso-vertuo-on-ice.html | seed/pages/vertuo-on-ice.html
//
// Each recipe is translated to all three channels (the vendor's own channel
// keeps the vendor's exact capsule and method) and written to
// content/recipes/<slug>.json as needs_testing. URLs already in the vault are
// skipped. Requires GEMINI_API_KEY for best results (JSON-LD-only otherwise).
// See VENDOR_IMPORT.md.

import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Mock server-only for standalone runs (same approach as scripts/test-translator.ts)
const origRequire = (Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require;
(Module.prototype as unknown as { require: (id: string, ...args: unknown[]) => unknown }).require = function (
  id: string,
  ...args: unknown[]
) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

interface Job {
  url: string;
  savedPage?: string;
}

function parseArgs(argv: string[]): { jobs: Job[]; dryRun: boolean } {
  const dryRun = argv.includes("--dry-run");
  const jobs: Job[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") continue;
    if (arg === "--file") {
      const file = argv[++i];
      for (const raw of readFileSync(file, "utf-8").split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const [url, saved] = line.split("|").map((p) => p.trim());
        jobs.push({ url, savedPage: saved ? path.resolve(path.dirname(file), saved) : undefined });
      }
      continue;
    }
    jobs.push({ url: arg });
  }
  return { jobs, dryRun };
}

function normalizeUrl(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
}

async function run() {
  const { jobs, dryRun } = parseArgs(process.argv.slice(2));
  if (jobs.length === 0) {
    console.error("Usage: npx tsx scripts/import-vendor.ts [--dry-run] (--file urls.txt | <url> ...)");
    process.exit(1);
  }

  const { detectVendor, extractVendorRecipe } = await import("../lib/translator/vendor-extractor");
  const { synthesizeRecipe } = await import("../lib/translator/synthesis");
  const { ingestTranslation } = await import("../lib/translator/ingest");
  const { getAllRecipes } = await import("../lib/recipes");

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠ GEMINI_API_KEY not set: JSON-LD-only extraction, no rewritten method steps.\n");
  }

  const existing = new Set(
    getAllRecipes()
      .map((r) => r.source?.url)
      .filter((u): u is string => Boolean(u))
      .map(normalizeUrl)
  );

  const summary = { imported: 0, skipped: 0, failed: 0 };

  for (const job of jobs) {
    const label = job.url;
    if (!detectVendor(job.url)) {
      console.log(`✗ ${label}\n    not a Nespresso or Cometeer URL`);
      summary.failed++;
      continue;
    }
    if (existing.has(normalizeUrl(job.url))) {
      console.log(`• ${label}\n    already in the vault, skipped`);
      summary.skipped++;
      continue;
    }

    const saved = job.savedPage ? readFileSync(job.savedPage, "utf-8") : undefined;
    const extraction = await extractVendorRecipe(job.url, saved);
    if (!extraction.ok) {
      console.log(`✗ ${label}\n    ${extraction.code}: ${extraction.message}`);
      summary.failed++;
      continue;
    }

    const result = synthesizeRecipe(extraction.ir);
    const novel = result.taxonomy_matches.filter((m) => m.is_novel).map((m) => m.raw_item);
    const detail = [
      `"${result.recipe.name}" via ${extraction.method}`,
      `${extraction.ir.stated_coffee.capsule_count ?? 1}× ${extraction.ir.stated_coffee.raw_name}`,
      `${extraction.ir.raw_ingredients.length} ingredients`,
      novel.length ? `novel: ${novel.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (dryRun) {
      console.log(`✓ ${label}\n    [dry run] ${result.recipe.slug} · ${detail}`);
      summary.imported++;
      continue;
    }

    const ingest = await ingestTranslation(result);
    if (!ingest.written) {
      console.log(
        `✗ ${label}\n    validation failed: ${ingest.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`
      );
      summary.failed++;
      continue;
    }
    existing.add(normalizeUrl(job.url));
    console.log(`✓ ${label}\n    content/recipes/${ingest.slug}.json · ${detail}`);
    summary.imported++;
  }

  console.log(
    `\n${dryRun ? "Would import" : "Imported"} ${summary.imported}, skipped ${summary.skipped}, failed ${summary.failed}.`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
