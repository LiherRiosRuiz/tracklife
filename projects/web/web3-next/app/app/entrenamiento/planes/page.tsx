"use client";

import { useEffect, useState } from "react";
import { api, type WorkoutPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button } from "@/components/ui";
import Link from "next/link";

export default function PlanesPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.workoutPlans(token)
      .then((r) => setPlans(r.plans))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const deletePlan = async (id: string) => {
    if (!token || !confirm("Eliminar este plan?")) return;
    setDeleteError("");
    try {
      await api.deleteWorkoutPlan(token, id);
      setPlans(plans.filter((p) => p._id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar el plan");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Mis planes" subtitle={`${plans.length} planes`} />
        <Button href="/app/entrenamiento/planes/nuevo">+ Crear plan</Button>
      </div>

      {deleteError && <p className="mb-3 text-sm text-danger">{deleteError}</p>}

      {loading ? (
        <p className="text-center text-muted">Cargando...</p>
      ) : plans.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted">No tienes planes de entrenamiento.</p>
          <Button href="/app/entrenamiento/planes/nuevo" className="mt-4">Crear tu primer plan</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan._id} className="flex items-center justify-between">
              <Link href={`/app/entrenamiento/planes/${plan._id}`} className="flex-1">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
                <p className="mt-1 text-xs text-muted">
                  {plan.exercises.length} ejercicios ·{" "}
                  {plan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} series
                </p>
              </Link>
              <button onClick={() => deletePlan(plan._id!)} className="ml-4 text-sm text-muted hover:text-danger">
                Eliminar
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
