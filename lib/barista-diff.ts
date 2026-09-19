/**
 * Static, type-safe copy for the "Why this changes" / Barista Diff panel.
 *
 * This is deliberately NOT derived from recipe content — it's the same
 * three sentences for every recipe, because the physical translation from
 * one coffee foundation to another doesn't change recipe to recipe. The
 * method flow / coffee base lines and the four reason categories (dilution,
 * cooling, dissolving mechanics, texture/body sequencing) are the exact
 * language given in the redesign spec; nothing here is invented per-recipe
 * coffee science.
 */
import type { Channel } from "./types";

export interface BaristaDiffEntry {
  methodFlow: string;
  coffeeBase: string;
  reason: string;
}

export const BARISTA_DIFF: Record<Channel, BaristaDiffEntry> = {
  cometeer: {
    methodFlow: "Melt → dilute → build",
    coffeeBase: "26 g frozen brewed extract",
    reason:
      "The extract starts frozen and concentrated — it has to melt and dilute back into brewed-strength coffee before the rest of the drink is built on top of it.",
  },
  nespresso: {
    methodFlow: "Pull → cool → build",
    coffeeBase: "40 ml espresso",
    reason:
      "A fresh pull comes out hot and concentrated, so it needs a moment to cool before it hits ice or milk — otherwise the texture breaks.",
  },
  instant: {
    methodFlow: "Dissolve → cool → build",
    coffeeBase: "1.5 tsp instant + hot water",
    reason:
      "The freeze-dried powder has to fully dissolve in hot water first, then cool — dissolving mechanics for a powder are different from working with an already-liquid concentrate.",
  },
};
