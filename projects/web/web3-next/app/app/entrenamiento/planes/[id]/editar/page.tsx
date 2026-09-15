"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { WorkoutPlanForm, type PlanDraft } from "@/components/WorkoutPlanForm";

export default function EditarPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const { data, loading, error, refetch } = useApiData(
    () => api.workoutPlan(token!, id),
    [token, id],
    { enabled: !!token && !!id },
  );

  const save = async (draft: PlanDraft) => {
    if (!token) return;
    try {
      await api.updateWorkoutPlan(token, id, draft);
      router.push(`/app/entrenamiento/planes/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e, "Error al guardar el plan") ?? "Error al guardar el plan");
    }
  };

  if (loading) return <SkeletonCard />;
  // Never render the editor over a failed read: it would seed an empty form and
  // then overwrite the real plan with it on save.
  if (error || !data) {
    return <ErrorState message={error || "No se pudo cargar el plan"} onRetry={refetch} />;
  }

  return (
    <WorkoutPlanForm
      title="Editar plan"
      subtitle={data.plan.name}
      submitLabel="Guardar cambios"
      initial={{
        name: data.plan.name,
        description: data.plan.description,
        exercises: data.plan.exercises ?? [],
      }}
      onSubmit={save}
    />
  );
}
