"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Exercise, type PlanExercise, type PlanSet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";

function emptySet(num: number): PlanSet {
  return { set_number: num, type: "normal", reps: 10, weight: 0, rest_seconds: 90 };
}

export default function NuevoPlanPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const addExercise = (ex: Exercise) => {
    setExercises([
      ...exercises,
      {
        exercise_id: ex._id!,
        exercise_name: ex.name,
        order: exercises.length + 1,
        sets: [emptySet(1), emptySet(2), emptySet(3)],
      },
    ]);
    setShowPicker(false);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order: i + 1 })));
  };

  const addSet = (exIndex: number) => {
    const updated = [...exercises];
    const ex = updated[exIndex];
    ex.sets = [...ex.sets, emptySet(ex.sets.length + 1)];
    setExercises(updated);
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exIndex].sets = updated[exIndex].sets
      .filter((_, i) => i !== setIndex)
      .map((s, i) => ({ ...s, set_number: i + 1 }));
    setExercises(updated);
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof PlanSet, value: number | string) => {
    const updated = [...exercises];
    (updated[exIndex].sets[setIndex] as Record<string, unknown>)[field] = value;
    setExercises([...updated]);
  };

  const save = async () => {
    if (!token || !name || exercises.length === 0) return;
    setSaving(true);
    try {
      await api.createWorkoutPlan(token, { name, description: description || undefined, exercises });
      router.push("/app/entrenamiento/planes");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Crear plan" subtitle="Configura ejercicios, series y descansos" />

      <Card className="mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del plan (ej: Push Day)"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </Card>

      {/* Exercise list */}
      {exercises.map((ex, exIdx) => (
        <Card key={exIdx} className="mb-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{ex.exercise_name}</h3>
            <button onClick={() => removeExercise(exIdx)} className="text-xs text-muted hover:text-red-400">
              Quitar
            </button>
          </div>

          {/* Set table header */}
          <div className="mb-2 grid grid-cols-5 gap-2 text-xs font-medium text-muted">
            <span>Serie</span>
            <span>Tipo</span>
            <span>Kg</span>
            <span>Reps</span>
            <span>Desc.</span>
          </div>

          {/* Sets */}
          {ex.sets.map((set, setIdx) => (
            <div key={setIdx} className="mb-1 grid grid-cols-5 items-center gap-2">
              <span className="text-sm text-muted">{set.set_number}</span>
              <select
                value={set.type}
                onChange={(e) => updateSet(exIdx, setIdx, "type", e.target.value)}
                className="rounded-lg border border-border bg-background px-1 py-1 text-xs"
              >
                <option value="normal">Normal</option>
                <option value="warmup">Warm-up</option>
                <option value="dropset">Dropset</option>
                <option value="failure">Fallo</option>
              </select>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={set.rest_seconds}
                  onChange={(e) => updateSet(exIdx, setIdx, "rest_seconds", Number(e.target.value))}
                  className="w-14 rounded-lg border border-border bg-background px-1 py-1 text-sm"
                />
                <button onClick={() => removeSet(exIdx, setIdx)} className="text-muted hover:text-red-400">
                  x
                </button>
              </div>
            </div>
          ))}

          <button onClick={() => addSet(exIdx)} className="mt-2 text-xs text-accent hover:underline">
            + Agregar serie
          </button>
        </Card>
      ))}

      {/* Add exercise button */}
      <Button onClick={() => setShowPicker(true)} variant="secondary" className="mb-4 w-full">
        + Agregar ejercicio
      </Button>

      {/* Save */}
      <Button onClick={save} className="w-full" disabled={!name || exercises.length === 0 || saving}>
        {saving ? "Guardando..." : "Guardar plan"}
      </Button>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePickerModal
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
