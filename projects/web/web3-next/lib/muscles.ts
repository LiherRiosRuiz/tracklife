export const MUSCLE_GROUPS = [
  { value: "chest", label: "Pecho" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "quadriceps", label: "Cuadriceps" },
  { value: "hamstrings", label: "Isquiotibiales" },
  { value: "glutes", label: "Gluteos" },
  { value: "lower_back", label: "Espalda baja" },
  { value: "lower back", label: "Espalda baja" },
  { value: "middle_back", label: "Espalda media" },
  { value: "middle back", label: "Espalda media" },
  { value: "lats", label: "Dorsales" },
  { value: "traps", label: "Trapecios" },
  { value: "abdominals", label: "Abdominales" },
  { value: "calves", label: "Pantorrillas" },
  { value: "forearms", label: "Antebrazos" },
] as const;

export function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((m) => m.value === value)?.label ?? value;
}

export const EQUIPMENT_TYPES = [
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "cable", label: "Polea" },
  { value: "machine", label: "Maquina" },
  { value: "body only", label: "Peso corporal" },
  { value: "kettlebells", label: "Kettlebell" },
  { value: "bands", label: "Bandas" },
  { value: "exercise ball", label: "Fitball" },
  { value: "other", label: "Otro" },
] as const;

export function equipmentLabel(value: string): string {
  return EQUIPMENT_TYPES.find((e) => e.value === value)?.label ?? value;
}
