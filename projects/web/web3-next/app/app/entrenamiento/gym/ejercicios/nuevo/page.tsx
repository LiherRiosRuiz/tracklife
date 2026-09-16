"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { ExerciseForm, type ExerciseDraft } from "@/components/ExerciseForm";

export default function NuevoEjercicioPage() {
  const { token } = useAuth();
  const router = useRouter();

  const create = async (draft: ExerciseDraft) => {
    if (!token) return;
    try {
      await api.createExercise(token, draft);
      router.push("/app/entrenamiento/gym/ejercicios");
    } catch (e) {
      throw new Error(toErrorMessage(e, "Error al guardar el ejercicio") ?? "Error al guardar el ejercicio");
    }
  };

  return (
    <ExerciseForm
      title="Nuevo ejercicio"
      subtitle="Añade uno que no esté en la biblioteca"
      submitLabel="Guardar ejercicio"
      onSubmit={create}
    />
  );
}
