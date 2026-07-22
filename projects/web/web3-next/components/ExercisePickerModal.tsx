"use client";

import { useState } from "react";
import { api, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { MUSCLE_GROUPS, muscleLabel } from "@/lib/muscles";

export function ExercisePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const { data, error } = useApiData(
    () => api.exercises(token!, { q: search || undefined, muscle_group: selectedMuscle || undefined }),
    [token, search, selectedMuscle],
    { enabled: !!token },
  );

  const exercises: Exercise[] = data?.exercises ?? [];

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
          {error && <p className="py-8 text-center text-sm text-danger">{error}</p>}
          {!error && exercises.map((ex) => (
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
          {!error && exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No se encontraron ejercicios</p>
          )}
        </div>
      </div>
    </div>
  );
}
