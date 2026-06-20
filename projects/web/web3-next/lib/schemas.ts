import { z } from "zod";

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(120),
  email: z.string().email("Email no válido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  username: z.string().max(60).optional(),
});

// ── Meals ───────────────────────────────────────────────────────────────────

export const mealItemSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
});

export const storeMealSchema = z.object({
  date: z.string().optional(),
  meal_type: z.enum(["breakfast", "lunch", "snack", "dinner", "other"], {
    error: "Tipo de comida no válido",
  }),
  items: z.array(mealItemSchema).min(1, "Añade al menos un alimento"),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
  shared_to_feed: z.boolean().optional(),
});

// ── Macros ──────────────────────────────────────────────────────────────────

export const macroTargetsSchema = z.object({
  calories: z.number().min(800, "Mínimo 800 kcal").max(10000, "Máximo 10.000 kcal"),
  protein: z.number().min(0, "No puede ser negativo").max(500),
  carbs: z.number().min(0, "No puede ser negativo").max(1000),
  fat: z.number().min(0, "No puede ser negativo").max(500),
});

// ── Workout ─────────────────────────────────────────────────────────────────

export const storeWorkoutSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(120),
  date: z.string().optional(),
  sets: z.array(z.object({
    exercise: z.string().min(1),
    weight: z.number().min(0),
    reps: z.number().int().min(1),
  })).min(1, "Añade al menos una serie"),
  duration_minutes: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  shared_to_feed: z.boolean().optional(),
});

// ── Biometrics ──────────────────────────────────────────────────────────────

export const storeBiometricSchema = z.object({
  type: z.enum(["sleep_score", "hrv", "resting_hr", "recovery_score", "strain", "steps", "weight", "body_fat", "muscle_mass", "spO2"]),
  value: z.number({ error: "El valor es obligatorio" }),
  unit: z.string().optional(),
  timestamp: z.string().optional(),
  source: z.string().optional(),
});

// ── Activity ────────────────────────────────────────────────────────────────

export const storeActivitySchema = z.object({
  type: z.enum(["run", "bike", "swim", "walk", "other"]),
  title: z.string().min(1, "El título es obligatorio").max(120),
  date: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional(),
  distance_km: z.number().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  shared_to_feed: z.boolean().optional(),
});

// ── Profile ─────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().optional(),
});

// ── Tipos inferidos ─────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type StoreMealInput = z.infer<typeof storeMealSchema>;
export type MacroTargetsInput = z.infer<typeof macroTargetsSchema>;
export type StoreWorkoutInput = z.infer<typeof storeWorkoutSchema>;
export type StoreBiometricInput = z.infer<typeof storeBiometricSchema>;
export type StoreActivityInput = z.infer<typeof storeActivitySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
