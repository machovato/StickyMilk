import type { Channel, Recipe, SweetnessLevel } from "@/lib/types";
import type { NutritionBreakdown } from "@/lib/nutrition";
import type { FieldError } from "@/lib/recipe-schema";

export type IRSourceType =
  | "nespresso"
  | "cometeer"
  | "social_tiktok"
  | "social_instagram"
  | "social_youtube"
  | "web"
  | "editorial";

export interface IRStatedCoffee {
  raw_name: string;
  system?: "vertuo" | "original" | "capsule" | "instant" | "espresso" | "brewed" | "cold_brew";
  intensity?: number;
  serving_size_ml?: number;
  shots?: number;
  /** How many capsules/pods the source uses (vendor imports). */
  capsule_count?: number;
  roast_profile?: "light" | "medium" | "dark";
}

export type ExtractionMode = "video_multimodal_ai" | "caption_heuristic" | "recipe_page";

export interface IRRawIngredient {
  amount?: number;
  unit?: string;
  item: string;
  notes?: string;
  group?: string;
  optional?: boolean;
}

export interface IRSubAssembly {
  name: string;
  type: "cold_foam" | "base" | "syrup" | "garnish";
  temperature_stability: "high" | "low";
}

export interface RecipeIR {
  source_type: IRSourceType;
  source_url: string;
  source_creator?: {
    name: string;
    handle: string;
    platform: string;
    avatar?: string;
  };
  generated_slug: string;
  raw_title: string;
  stated_coffee: IRStatedCoffee;
  raw_ingredients: IRRawIngredient[];
  raw_steps: string[];
  sub_assemblies?: IRSubAssembly[];
  metadata: {
    glassware?: string;
    temperature: "iced" | "hot" | "blended";
    prep_time_minutes?: number;
    sweetness_hint?: SweetnessLevel;
    /** One-sentence tasting description written by the extractor (replaces template text) */
    description?: string;
    /** Kind of drink, e.g. "cappuccino", "iced latte"; used for the drink-type tag */
    drink_style?: string;
  };
  extraction_mode?: ExtractionMode;
  text_overlays?: string[];
  thumbnail_url?: string;
  hero_frame_base64?: string;
  hero_frame_reason?: string;
}

export interface TranslationSuperpowers {
  hardware_brew_math: {
    cometeer: {
      summary: string;
      ratio: string;
      recommendation: string;
    };
    nespresso: {
      summary: string;
      ratio: string;
      pod_pick: string;
      system: "vertuo" | "original";
    };
    instant: {
      summary: string;
      ratio: string;
      bloom_note: string;
    };
  };
  nutritional_reality: {
    calories: number;
    sugar_g: number;
    fat_g: number;
    protein_g: number;
    caffeine_mg: number;
    human_caffeine_ref: string;
    human_sugar_ref: string;
  };
  mise_en_place: {
    phases: Array<{
      phaseNumber: number;
      name: string;
      steps: string[];
    }>;
  };
}

export interface TaxonomyMatch {
  raw_item: string;
  matched_id?: string;
  matched_name?: string;
  is_novel: boolean;
}

export interface TranslationResult {
  ir: RecipeIR;
  recipe: Recipe;
  nutritional_breakdowns: Record<Channel, NutritionBreakdown>;
  superpowers: TranslationSuperpowers;
  taxonomy_matches: TaxonomyMatch[];
  validation_errors: FieldError[];
  warnings: string[];
  extraction_mode?: ExtractionMode;
  text_overlays?: string[];
  is_cached_hit?: boolean;
  /** A visitor's translation was saved to the admin review queue */
  queued_for_review?: boolean;
}

/** Failure codes emitted by reel_extractor.py (plus Node-side TIMEOUT). */
export type VideoExtractionErrorCode =
  | "NOT_CONFIGURED"
  | "DOWNLOAD_FAILED"
  | "TOO_LARGE"
  | "NO_FRAMES"
  | "MODEL_UNAVAILABLE"
  | "PARSE_FAILED"
  | "NOT_BEVERAGE"
  | "TIMEOUT"
  | "UNKNOWN";

export type VideoExtractionResult =
  | { ok: true; ir: RecipeIR }
  | { ok: false; code: VideoExtractionErrorCode; message: string };
