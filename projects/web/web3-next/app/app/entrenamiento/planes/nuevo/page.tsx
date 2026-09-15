"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { WorkoutPlanForm, type PlanDraft } from "@/components/WorkoutPlanForm";

export default function NuevoPlanPage() {
  const { token } = useAuth();
  const router = useRouter();

  const create = async (draft: PlanDraft) => {
    if (!token) return;
    try {
      await api.createWorkoutPlan(token, draft);
      router.push("/app/entrenamiento/planes");
    } catch (e) {
      throw new Error(toErrorMessage(e, "Error al guardar el plan") ?? "Error al guardar el plan");
    }
  };

  return (
    <WorkoutPlanForm
      title="Crear plan"
      subtitle="Configura ejercicios, series y descansos"
      submitLabel="Guardar plan"
      onSubmit={create}
    />
  );
}
