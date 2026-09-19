import type { Preparation } from "./types";

export interface NutritionBreakdown {
  calories: number;
  sugar_g: number;
  fat_g: number;
  protein_g: number;
  caffeine_mg: number;
}

interface MacroItem {
  baseUnit: "tbsp" | "tsp" | "oz" | "cup" | "scoop" | "capsule" | "pod";
  calories: number;
  sugar_g: number;
  fat_g: number;
  protein_g: number;
  caffeine_mg?: number;
}

/**
 * Standard USDA & manufacturer verified nutritional benchmarks for specialty
 * coffee and condensed milk formulations.
 */
const INGREDIENT_BENCHMARKS: Record<string, MacroItem> = {
  sweetened_condensed_milk: {
    baseUnit: "tbsp",
    calories: 65,
    sugar_g: 11,
    fat_g: 1.7,
    protein_g: 1.5,
  },
  milk: {
    baseUnit: "oz",
    calories: 18.5,
    sugar_g: 1.5,
    fat_g: 1.0,
    protein_g: 1.0,
  },
  oat_milk: {
    baseUnit: "oz",
    calories: 16,
    sugar_g: 0.9,
    fat_g: 0.6,
    protein_g: 0.4,
  },
  half_and_half: {
    baseUnit: "oz",
    calories: 40,
    sugar_g: 1.3,
    fat_g: 3.5,
    protein_g: 0.9,
  },
  heavy_cream: {
    baseUnit: "tbsp",
    calories: 50,
    sugar_g: 0.4,
    fat_g: 5.4,
    protein_g: 0.4,
  },
  butter: {
    baseUnit: "tbsp",
    calories: 102,
    sugar_g: 0,
    fat_g: 11.5,
    protein_g: 0.1,
  },
  mascarpone: {
    baseUnit: "oz",
    calories: 120,
    sugar_g: 1.0,
    fat_g: 12.0,
    protein_g: 2.0,
  },
  vanilla_ice_cream: {
    baseUnit: "scoop",
    calories: 140,
    sugar_g: 16,
    fat_g: 7.0,
    protein_g: 2.5,
  },
  salted_caramel_syrup: {
    baseUnit: "tsp",
    calories: 17,
    sugar_g: 4.3,
    fat_g: 0,
    protein_g: 0,
  },
  vanilla_syrup: {
    baseUnit: "tsp",
    calories: 17,
    sugar_g: 4.3,
    fat_g: 0,
    protein_g: 0,
  },
  simple_syrup: {
    baseUnit: "tsp",
    calories: 17,
    sugar_g: 4.3,
    fat_g: 0,
    protein_g: 0,
  },
  caramel_sauce: {
    baseUnit: "tsp",
    calories: 20,
    sugar_g: 4.5,
    fat_g: 0.3,
    protein_g: 0.2,
  },
  chocolate_syrup: {
    baseUnit: "tsp",
    calories: 20,
    sugar_g: 4.5,
    fat_g: 0.3,
    protein_g: 0.2,
  },
  maple_syrup: {
    baseUnit: "tbsp",
    calories: 52,
    sugar_g: 13.5,
    fat_g: 0,
    protein_g: 0,
  },
  brown_sugar: {
    baseUnit: "tbsp",
    calories: 48,
    sugar_g: 12,
    fat_g: 0,
    protein_g: 0,
  },
  sugar: {
    baseUnit: "tbsp",
    calories: 48,
    sugar_g: 12,
    fat_g: 0,
    protein_g: 0,
  },
  powdered_sugar: {
    baseUnit: "tbsp",
    calories: 30,
    sugar_g: 7.5,
    fat_g: 0,
    protein_g: 0,
  },
  chocolate_chips: {
    baseUnit: "tbsp",
    calories: 70,
    sugar_g: 8,
    fat_g: 4,
    protein_g: 0.8,
  },
  cometeer_capsule: {
    baseUnit: "capsule",
    calories: 5,
    sugar_g: 0,
    fat_g: 0,
    protein_g: 0.5,
    caffeine_mg: 130,
  },
  cometeer_decaf_capsule: {
    baseUnit: "capsule",
    calories: 5,
    sugar_g: 0,
    fat_g: 0,
    protein_g: 0.5,
    caffeine_mg: 4,
  },
  nespresso_pod: {
    baseUnit: "pod",
    calories: 2,
    sugar_g: 0,
    fat_g: 0,
    protein_g: 0.2,
    caffeine_mg: 65,
  },
  nespresso_double_pod: {
    baseUnit: "pod",
    calories: 4,
    sugar_g: 0,
    fat_g: 0,
    protein_g: 0.4,
    caffeine_mg: 150,
  },
  instant_coffee: {
    baseUnit: "tsp",
    calories: 4,
    sugar_g: 0,
    fat_g: 0,
    protein_g: 0.3,
    caffeine_mg: 40,
  },
};

/** Normalizes ingredient units to the benchmark's base unit. */
function getUnitMultiplier(fromUnit: string | undefined, toUnit: string): number {
  if (!fromUnit || fromUnit === toUnit) return 1;

  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();

  // Volume conversions in fluid ounces
  const ozFactors: Record<string, number> = {
    oz: 1,
    tbsp: 0.5,
    tsp: 1 / 6,
    cup: 8,
    ml: 1 / 29.5735,
  };

  if (ozFactors[from] !== undefined && ozFactors[to] !== undefined) {
    return ozFactors[from] / ozFactors[to];
  }

  // Count/discrete fallback
  return 1;
}

/**
 * Deterministically calculates macros and caffeine for a preparation.
 * Scales dynamically with the portion multiplier (1x, 2x, 4x).
 */
export function calculateNutrition(
  prep: Preparation,
  scale = 1
): NutritionBreakdown {
  let calories = 0;
  let sugar = 0;
  let fat = 0;
  let protein = 0;
  let caffeine = 0;

  for (const ing of prep.ingredients) {
    if (ing.amount == null || !ing.item_id) continue;

    const benchmark = INGREDIENT_BENCHMARKS[ing.item_id];
    if (!benchmark) continue;

    const unitRatio = getUnitMultiplier(ing.unit, benchmark.baseUnit);
    const scaledAmount = ing.amount * scale * unitRatio;

    calories += benchmark.calories * scaledAmount;
    sugar += benchmark.sugar_g * scaledAmount;
    fat += benchmark.fat_g * scaledAmount;
    protein += benchmark.protein_g * scaledAmount;

    if (benchmark.caffeine_mg) {
      caffeine += benchmark.caffeine_mg * scale * unitRatio;
    }
  }

  // If the recipe has an explicitly benchmarked/tested caffeine_mg, prioritize it
  if (prep.caffeine_mg != null) {
    caffeine = prep.caffeine_mg * scale;
  } else if (prep.caffeine_level === "decaf") {
    caffeine = Math.min(caffeine, 5 * scale);
  }

  return {
    calories: Math.round(calories),
    sugar_g: Math.round(sugar * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    protein_g: Math.round(protein * 10) / 10,
    caffeine_mg: Math.round(caffeine),
  };
}
