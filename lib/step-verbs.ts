/**
 * Deterministically pulls a leading action verb off a step's own text, for
 * the "01 STIR" / "02 POUR" step treatment — never invents or rewrites the
 * instruction, just labels it using the word already there. Falls back to
 * the generic "STEP" label when the first word isn't a recognized action
 * (a caution like "Do not swap capsules…", or anything unexpected).
 *
 * The whitelist below was built from every step across the current 14
 * seed recipes (see content/recipes/*.json) — it's exhaustive for today's
 * content, not a general-purpose verb detector. A future recipe using a
 * new verb will just fall back to "STEP" until it's added here.
 */
const VERB_WHITELIST = new Set([
  "ADD",
  "BLEND",
  "BREW",
  "CHILL",
  "DIP",
  "DISSOLVE",
  "DROP",
  "DUST",
  "FILL",
  "FINISH",
  "FOLD",
  "GARNISH",
  "HEAT",
  "LAYER",
  "LET",
  "MELT",
  "PLACE",
  "POUR",
  "RUN",
  "SERVE",
  "SHAKE",
  "SPLIT",
  "SPOON",
  "SPREAD",
  "STIR",
  "STRAIN",
  "TASTE",
  "TOP",
  "WARM",
  "WHIP",
]);

// Words that lead a sentence but aren't themselves the action — look at
// the next word instead ("Slowly pour…" -> POUR).
const LEADING_ADVERBS = new Set(["SLOWLY", "GENTLY", "QUICKLY", "CAREFULLY"]);

function clean(word: string): string {
  return word.replace(/[.,;:!]+$/, "").toUpperCase();
}

export function extractStepVerb(step: string): string {
  const words = step.trim().split(/\s+/);
  if (words.length === 0) return "STEP";

  let first = clean(words[0]);
  const second = words[1] ? clean(words[1]) : undefined;

  // "Do not …" is a caution, not an action step.
  if (first === "DO" && second === "NOT") return "STEP";

  if (LEADING_ADVERBS.has(first) && second) first = second;

  return VERB_WHITELIST.has(first) ? first : "STEP";
}
