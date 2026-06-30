"use client";

import { useEffect, useState } from "react";
import { type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MUSCLE_GROUPS, muscleLabel } from "@/lib/muscles";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://api.tracklife.test";

export function ExercisePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedMuscle) params.set("muscle_group", selectedMuscle);

    fetch(`${API_URL}/api/exercises?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => setExercises(data.exercises ?? []))
      .catch(console.error);
  }, [token, search, selectedMuscle]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-surface sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Elegir ejercicio</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            Cerrar
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          />
        </div>

        {/* Muscle filter */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          <button
            onClick={() => setSelectedMuscle(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              !selectedMuscle ? "bg-accent text-black" : "border border-border text-muted"
            }`}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg.value}
              onClick={() => setSelectedMuscle(selectedMuscle === mg.value ? null : mg.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                selectedMuscle === mg.value ? "bg-accent text-black" : "border border-border text-muted"
              }`}
            >
              {mg.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          {exercises.map((ex) => (
            <button
              key={ex._id}
              onClick={() => onSelect(ex)}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-accent transition"
            >
              {ex.image_url && (
                <img src={ex.image_url} alt="" className="h-12 w-12 rounded-lg bg-background object-contain" />
              )}
              <div>
                <p className="text-sm font-medium">{ex.name}</p>
                <p className="text-xs text-muted">{muscleLabel(ex.muscle_group ?? "")}</p>
              </div>
            </button>
          ))}
          {exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No se encontraron ejercicios</p>
          )}
        </div>
      </div>
    </div>
  );
}
