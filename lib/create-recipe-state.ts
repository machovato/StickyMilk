import type { FieldError } from "./recipe-schema";

/**
 * Split out of `lib/actions/create-recipe.ts` on purpose: a `"use server"`
 * file may only export async functions — a plain object export like
 * `initialCreateRecipeState` would break the build if it lived there.
 */
export interface CreateRecipeState {
  errors: FieldError[];
}

export const initialCreateRecipeState: CreateRecipeState = { errors: [] };
