import { describe, expect, it } from "vitest";
import { toMacros } from "@/lib/nutriments";

describe("toMacros — OpenFoodFacts nutriment mapping", () => {
  it("N1: reads the per-100g key shape OFF normally returns", () => {
    expect(
      toMacros({
        "energy-kcal_100g": 250,
        proteins_100g: 12,
        carbohydrates_100g: 30,
        fat_100g: 8,
      }),
    ).toEqual({ calories: 250, protein: 12, carbs: 30, fat: 8 });
  });

  it("N2: falls back to the bare key shape when the _100g variant is absent", () => {
    expect(
      toMacros({
        energy_kcal: 180,
        proteins: 9,
        carbohydrates: 20,
        fat: 5,
      }),
    ).toEqual({ calories: 180, protein: 9, carbs: 20, fat: 5 });
  });

  it("N3: prefers the _100g variant when both shapes are present", () => {
    expect(
      toMacros({
        "energy-kcal_100g": 250,
        energy_kcal: 999,
        proteins_100g: 12,
        proteins: 99,
      }),
    ).toMatchObject({ calories: 250, protein: 12 });
  });

  it("N4: missing keys become 0 rather than NaN or undefined", () => {
    // This is the silent-bad-data case: a product OFF has no macros for must not
    // quietly log a meal of NaN calories.
    expect(toMacros({})).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("N5: an absent nutriments object is handled like an empty one", () => {
    expect(toMacros(undefined)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("N6: a non-numeric value is coerced to 0, never propagated as NaN", () => {
    expect(
      toMacros({ "energy-kcal_100g": Number.NaN, proteins_100g: 10 }),
    ).toMatchObject({ calories: 0, protein: 10 });
  });
});
