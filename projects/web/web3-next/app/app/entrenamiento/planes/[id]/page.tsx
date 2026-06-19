"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type WorkoutPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.workoutPlan(token, id)
      .then((r) => setPlan(r.plan))
      .catch(() => router.push("/app/entrenamiento/planes"))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const startWorkout = async () => {
    if (!token || !plan?._id) return;
    setStarting(true);
    try {
      const { workout } = await api.workoutFromPlan(token, plan._id);
      // Store the draft workout in sessionStorage and navigate to active page
      sessionStorage.setItem("tracklife_active_workout", JSON.stringify(workout));
      sessionStorage.setItem("tracklife_workout_start", Date.now().toString());
      router.push("/app/entrenamiento/gym/activo");
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
  if (!plan) return null;

  const totalSets = plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div>
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        ← Volver
      </Button>

      <PageHeader title={plan.name} subtitle={plan.description ?? undefined} />

      <div className="mb-4 flex gap-3">
        <span className="rounded-full bg-accent-dim px-3 py-1 text-xs text-accent">
          {plan.exercises.length} ejercicios
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          {totalSets} series
        </span>
      </div>

      {/* Exercise list */}
      {plan.exercises
        .sort((a, b) => a.order - b.order)
        .map((ex, i) => (
          <Card key={i} className="mb-3">
            <h3 className="font-semibold">{ex.exercise_name}</h3>
            <div className="mt-2 space-y-1">
              {ex.sets.map((set, si) => (
                <div key={si} className="flex gap-4 text-sm text-muted">
                  <span>Serie {set.set_number}</span>
                  <span>{set.weight}kg</span>
                  <span>{set.reps} reps</span>
                  <span>{set.rest_seconds}s descanso</span>
                  {set.type !== "normal" && (
                    <span className="rounded bg-accent-dim px-1.5 text-xs text-accent">{set.type}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

      <Button onClick={startWorkout} className="mt-4 w-full text-lg py-3" disabled={starting}>
        {starting ? "Preparando..." : "Iniciar Workout"}
      </Button>
    </div>
  );
}
