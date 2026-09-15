"use client";

import { useState } from "react";
import { api, type MealEntry, type FoodItem } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui";

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
  { value: "other", label: "Snack" },
];

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

/** "" for a missing number so the field reads empty rather than a misleading 0. */
function initial(value: number | undefined | null): string {
  return value === null || value === undefined ? "" : String(value);
}

export function EditMealModal({
  meal,
  token,
  onSaved,
  onClose,
}: {
  meal: MealEntry;
  token: string;
  onSaved: (updated: MealEntry) => void;
  onClose: () => void;
}) {
  const first: FoodItem = meal.items[0] ?? { name: "" };
  const [mealType, setMealType] = useState(meal.meal_type ?? "lunch");
  const [name, setName] = useState(first.name ?? "");
  const [calories, setCalories] = useState(initial(first.calories));
  const [protein, setProtein] = useState(initial(first.protein));
  const [carbs, setCarbs] = useState(initial(first.carbs));
  const [fat, setFat] = useState(initial(first.fat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!meal.id) return;
    setError("");
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      // Only the first item is editable here; meals logged from the scanner and the
      // search flow always carry exactly one. Laravel recalculates totals server-side.
      const { meal: updated } = await api.updateMeal(token, meal.id, {
        meal_type: mealType,
        items: [{
          ...first,
          name: name.trim(),
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        }],
      });
      onSaved(updated);
    } catch (e) {
      const msg = toErrorMessage(e, "Error al guardar los cambios");
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-surface sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Editar comida</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            Cerrar
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            aria-label="Tipo de comida"
            className={inputClass}
          >
            {MEAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Kcal" type="number" className={inputClass} />
            <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Proteína" type="number" className={inputClass} />
            <input value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbos" type="number" className={inputClass} />
            <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Grasas" type="number" className={inputClass} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
