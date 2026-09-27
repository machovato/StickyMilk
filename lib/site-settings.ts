import "server-only";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Site-wide editorial choices, kept in one small file (content/site/settings.json)
 * rather than as flags on recipes: "which recipe is the Current Obsession" has
 * exactly one answer, so it lives in exactly one place.
 */

const SETTINGS_FILE = path.join(process.cwd(), "content", "site", "settings.json");

export interface SiteSettings {
  _about?: string;
  /** Slug of the recipe featured in the homepage hero */
  current_obsession?: string;
}

export function getSiteSettings(): SiteSettings {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8")) as SiteSettings;
  } catch {
    // Missing or unreadable file: the homepage falls back to its automatic pick
    return {};
  }
}

export function updateSiteSettings(patch: Partial<SiteSettings>): SiteSettings {
  const next = { ...getSiteSettings(), ...patch };
  writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2) + "\n", "utf-8");
  return next;
}
