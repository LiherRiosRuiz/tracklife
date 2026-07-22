"use client";

import { useMemo, useState } from "react";
import { api, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Card, PageHeader } from "@/components/ui";
import { SkeletonGrid } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, muscleLabel, equipmentLabel } from "@/lib/muscles";
import Link from "next/link";

export default function EjerciciosPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData(
    () => api.exercises(token!),
    [token],
    { enabled: !!token },
  );

  const exercises = useMemo<Exercise[]>(() => {
    let list = data?.exercises ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (selectedMuscle) {
      // Mapear variante underscore → espacio para cubrir ambas convenciones del dataset
      const alt = selectedMuscle.replace(/_/g, " ");
      list = list.filter(
        (e) => e.muscle_group === selectedMuscle || e.muscle_group === alt,
      );
    }
    if (selectedEquipment) {
      list = list.filter((e) => e.equipment === selectedEquipment);
    }
    return list;
  }, [data, search, selectedMuscle, selectedEquipment]);

  const uniqueMuscleGroups = MUSCLE_GROUPS.filter(
    (mg, i, arr) => arr.findIndex((m) => m.label === mg.label) === i,
  );

  return (
    <div>
      <PageHeader title="Biblioteca de ejercicios" subtitle={`${exercises.length} ejercicios`} />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar ejercicio..."
        className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted"
      />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedMuscle(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !selectedMuscle ? "bg-accent text-black" : "border border-border text-muted hover:border-accent"
          }`}
        >
          Todos
        </button>
        {uniqueMuscleGroups.map((mg) => (
          <button
            key={mg.value}
            onClick={() => setSelectedMuscle(selectedMuscle === mg.value ? null : mg.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedMuscle === mg.value
                ? "bg-accent text-black"
                : "border border-border text-muted hover:border-accent"
            }`}
          >
            {mg.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedEquipment(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !selectedEquipment
              ? "bg-accent-dim text-accent"
              : "border border-border text-muted hover:border-accent"
          }`}
        >
          Todo equipo
        </button>
        {EQUIPMENT_TYPES.map((eq) => (
          <button
            key={eq.value}
            onClick={() => setSelectedEquipment(selectedEquipment === eq.value ? null : eq.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedEquipment === eq.value
                ? "bg-accent-dim text-accent"
                : "border border-border text-muted hover:border-accent"
            }`}
          >
            {eq.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonGrid count={6} cols="sm:grid-cols-2 lg:grid-cols-3" />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => (
            <Link key={e.id ?? e.name} href={`/app/entrenamiento/gym/ejercicios/${e.id}`}>
              <Card className="cursor-pointer transition hover:border-accent">
                {e.image_url && (
                  <img
                    src={e.image_url}
                    alt={e.name}
                    className="mb-3 h-40 w-full rounded-xl bg-background object-contain"
                    loading="lazy"
                  />
                )}
                <h3 className="font-semibold">{e.name}</h3>
                <div className="mt-1 flex gap-2 text-xs text-muted">
                  <span>{muscleLabel(e.muscle_group ?? "")}</span>
                  {e.equipment && <span>· {equipmentLabel(e.equipment)}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {!loading && !error && exercises.length === 0 && (
        <p className="mt-8 text-center text-muted">No se encontraron ejercicios</p>
      )}
    </div>
  );
}
