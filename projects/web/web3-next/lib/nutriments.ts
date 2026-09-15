import type { MacroTargets } from "@/lib/api";

/**
 * OpenFoodFacts returns nutriments under two key shapes depending on the endpoint
 * and the product record: the per-100g form ("energy-kcal_100g") and a bare form
 * ("energy_kcal"). Both the barcode scanner and the food search hit the same raw
 * object, so this mapping lives here once instead of being duplicated per page.
 */
export type Nutriments = Record<string, number> | undefined;

/** Coerces to a finite number; anything else (missing, NaN, Infinity) becomes 0. */
function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Picks the first key that holds a finite number, else 0. */
function pick(n: Record<string, number>, ...keys: string[]): number {
  for (const key of keys) {
    const value = num(n[key]);
    if (value !== 0) return value;
  }
  // Every candidate was missing or non-finite — 0 is the honest answer, and it
  // must never be NaN: a NaN would sail through the form into a logged meal.
  return 0;
}

export function toMacros(nutriments: Nutriments): MacroTargets {
  const n = nutriments ?? {};
  return {
    calories: pick(n, "energy-kcal_100g", "energy_kcal"),
    protein: pick(n, "proteins_100g", "proteins"),
    carbs: pick(n, "carbohydrates_100g", "carbohydrates"),
    fat: pick(n, "fat_100g", "fat"),
  };
}
