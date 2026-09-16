"use client";

import { useParams, useRouter } from "next/navigation";
import { api, type Workout } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Button, Card, PageHeader, Stat } from "@/components/ui";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const { data, loading, error, refetch } = useApiData(
    () => api.workoutDetail(token!, id),
    [token, id],
    { enabled: !!token && !!id },
  );

  if (loading) return <SkeletonCard />;
  if (error || !data) {
    return <ErrorState message={error || "No se pudo cargar el entrenamiento"} onRetry={refetch} />;
  }

  const workout: Workout = data.workout;
  // Sets arrive flat; grouping by exercise is what makes the session readable.
  const exercises = [...new Set(workout.sets.map((s) => s.exercise))];

  return (
    <div>
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        ← Volver
      </Button>
      <PageHeader
        title={workout.name}
        subtitle={workout.date ? formatDate(workout.date) : undefined}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Volumen" value={Math.round(workout.total_volume ?? 0).toLocaleString("es-ES")} unit="kg" size="md" />
          <Stat label="Series" value={workout.sets.length} size="md" />
          <Stat label="Ejercicios" value={exercises.length} size="md" />
        </div>
      </Card>

      {exercises.map((exName) => {
        const exSets = workout.sets.filter((s) => s.exercise === exName);
        return (
          <Card key={exName} className="mb-3">
            <h3 className="mb-2 font-semibold">{exName}</h3>
            <div className="space-y-1">
              {exSets.map((s, i) => (
                <p key={i} className="text-sm text-muted">
                  Serie {s.set_number ?? i + 1} — {s.weight} kg × {s.reps} reps
                  {s.type && s.type !== "normal" ? ` (${s.type})` : ""}
                </p>
              ))}
            </div>
          </Card>
        );
      })}

      {workout.duration_minutes != null && (
        <Card>
          <p className="text-sm text-muted">Duración: {workout.duration_minutes} min</p>
        </Card>
      )}
    </div>
  );
}
