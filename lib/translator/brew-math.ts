import type { IRStatedCoffee } from "./types";

/**
 * Brew math: translate a recipe's coffee between Nespresso Vertuo, Cometeer
 * and instant by DOSE, not volume. See BREW_MATH.md for the reasoning.
 *
 * Rules (agreed with the test kitchen):
 * - Flavor first. The common unit is one "double": 1 Vertuo Double Espresso
 *   (80 ml) = 1 Cometeer capsule = 2 rounded tsp instant espresso = 2
 *   espresso shots. Doses are linear: 2 doubles = 2 capsules = 4 tsp.
 * - Espresso-style drinks never get water added to match volume; in a milk
 *   drink the milk does that. Brewed-coffee sources (Vertuo Mug, drip, cold
 *   brew) are the exception: the coffee IS the drink's volume, so Cometeer
 *   and instant get water to match it.
 * - Whole units only for Nespresso pods and Cometeer capsules (nobody splits
 *   a capsule). Instant rounds to 1/2 tsp.
 * - Caffeine is reported per machine, never used to shrink a dose. Cometeer
 *   Half Caff / Decaf capsules are the lower-caffeine option.
 *
 * All numbers here are defaults to be tuned by tasting.
 */

export type CoffeeStyle = "espresso" | "brewed";

export interface CoffeeDose {
  /** Dose in doubles (1 = one Vertuo Double Espresso / one Cometeer capsule) */
  doubles: number;
  /** Espresso-style shots vs brewed coffee (where the coffee is also the volume) */
  style: CoffeeStyle;
  /** Liquid volume of the source coffee, for brewed-style volume matching */
  volume_ml?: number;
}

/** Vertuo brew sizes (ml) above this are brewed coffee, not espresso. */
const VERTUO_ESPRESSO_MAX_ML = 90;
/** Vertuo Espresso (40 ml) and smaller count as half a double. */
const VERTUO_SINGLE_MAX_ML = 45;
/** ~One cup (8 oz) of brewed coffee or ready-to-drink cold brew ≈ one double. */
const BREWED_ML_PER_DOUBLE = 240;
/** Cometeer's own guidance for hot coffee: 6–8 oz water per capsule. */
const COMETEER_WATER_OZ_PER_CAPSULE = 7;
const INSTANT_TSP_PER_DOUBLE = 2;
/** Instant bloom water for espresso-style drinks: 1 oz per tsp (2 tsp -> 60 ml). */
const INSTANT_BLOOM_ML_PER_TSP = 30;

/** Normalizes whatever the extractor stated into a dose in doubles. */
export function doseFromStated(stated: IRStatedCoffee): CoffeeDose {
  const count = stated.capsule_count && stated.capsule_count > 0 ? stated.capsule_count : undefined;
  const ml = stated.serving_size_ml;
  const shotsFallback = (stated.shots && stated.shots > 0 ? stated.shots : 2) / 2;

  switch (stated.system) {
    case "vertuo": {
      if (!count) return { doubles: shotsFallback, style: "espresso" };
      if (ml && ml > VERTUO_ESPRESSO_MAX_ML) return { doubles: count, style: "brewed", volume_ml: ml * count };
      if (ml && ml <= VERTUO_SINGLE_MAX_ML) return { doubles: count / 2, style: "espresso" };
      return { doubles: count, style: "espresso" };
    }
    case "original":
      // One Original pod is a single shot (ristretto, espresso or lungo)
      return { doubles: count ? count / 2 : shotsFallback, style: "espresso" };
    case "capsule": // Cometeer
      return { doubles: count ?? shotsFallback, style: "espresso" };
    case "espresso":
      return { doubles: count ? count / 2 : shotsFallback, style: "espresso" };
    case "instant":
      return { doubles: count ? count / INSTANT_TSP_PER_DOUBLE : shotsFallback, style: "espresso" };
    case "brewed":
    case "cold_brew": {
      const volume = ml ?? BREWED_ML_PER_DOUBLE;
      return { doubles: Math.max(0.5, volume / BREWED_ML_PER_DOUBLE), style: "brewed", volume_ml: volume };
    }
    default:
      return { doubles: shotsFallback, style: "espresso" };
  }
}

export interface NespressoPlan {
  pods: Array<{ count: number; kind: "double" | "espresso" | "mug"; ml: number; item_id: string }>;
  /** Total caffeine-bearing pods, for Preparation.capsule_count */
  capsule_count: number;
  summary: string;
}

/** Vertuo pods for a dose: Double Espresso pods, plus one Espresso pod for a half. */
export function nespressoFor(dose: CoffeeDose): NespressoPlan {
  if (dose.style === "brewed") {
    const count = Math.max(1, Math.round(dose.doubles));
    return {
      pods: [{ count, kind: "mug", ml: 230, item_id: "nespresso_double_pod" }],
      capsule_count: count,
      summary: `${count} Vertuo Mug pod${count === 1 ? "" : "s"} (230 ml)`,
    };
  }
  const halves = Math.max(1, Math.round(dose.doubles * 2));
  const doubles = Math.floor(halves / 2);
  const singles = halves % 2;
  const pods: NespressoPlan["pods"] = [];
  if (doubles) pods.push({ count: doubles, kind: "double", ml: 80, item_id: "nespresso_double_pod" });
  if (singles) pods.push({ count: singles, kind: "espresso", ml: 40, item_id: "nespresso_pod" });
  const summary = pods
    .map((p) => `${p.count} ${p.kind === "double" ? "Double Espresso" : "Espresso"} pod${p.count === 1 ? "" : "s"} (${p.ml} ml)`)
    .join(" + ");
  return { pods, capsule_count: doubles + singles, summary };
}

export interface CometeerPlan {
  capsules: number;
  /** Frozen only for plain hot brewed coffee; melted for everything else */
  state: "melted" | "frozen";
  /** Water to add, for brewed-style sources only */
  water_oz?: number;
  /** When whole-capsule rounding changes the strength */
  strength_note?: string;
  summary: string;
}

export function cometeerFor(dose: CoffeeDose, opts: { hot: boolean; hasMilk: boolean }): CometeerPlan {
  const capsules = Math.max(1, Math.round(dose.doubles));
  const brewed = dose.style === "brewed";
  const state = brewed && opts.hot && !opts.hasMilk ? "frozen" : "melted";
  const water_oz = brewed
    ? Math.round(dose.volume_ml ? dose.volume_ml / 30 : capsules * COMETEER_WATER_OZ_PER_CAPSULE)
    : undefined;
  const strength_note =
    capsules > dose.doubles + 0.01
      ? "A little stronger than the original: Cometeer capsules can't be split."
      : capsules < dose.doubles - 0.01
      ? "A little milder than the original: Cometeer capsules can't be split."
      : undefined;
  return {
    capsules,
    state,
    water_oz,
    strength_note,
    summary: `${capsules} capsule${capsules === 1 ? "" : "s"}, ${state}${water_oz ? ` + ${water_oz} oz water` : ""}`,
  };
}

export interface InstantPlan {
  tsp: number;
  /** Hot water to dissolve (espresso-style) or to make the coffee (brewed-style) */
  water_ml: number;
  summary: string;
}

export function instantFor(dose: CoffeeDose, opts: { bloomMlOverride?: number } = {}): InstantPlan {
  const tsp = Math.max(1, Math.round(dose.doubles * INSTANT_TSP_PER_DOUBLE * 2) / 2);
  const water_ml =
    dose.style === "brewed" && dose.volume_ml
      ? Math.round(dose.volume_ml)
      : opts.bloomMlOverride ?? tsp * INSTANT_BLOOM_ML_PER_TSP;
  return { tsp, water_ml, summary: `${tsp} tsp instant espresso in ${Math.round(water_ml / 30)} oz hot water` };
}
