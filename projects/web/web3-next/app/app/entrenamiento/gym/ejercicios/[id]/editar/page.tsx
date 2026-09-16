"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Card, PageHeader } from "@/components/ui";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { ExerciseForm, type ExerciseDraft } from "@/components/ExerciseForm";

export default function EditarEjercicioPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const { data, loading, error, refetch } = useApiData(
    () => api.exerciseDetail(token!, id),
    [token, id],
    { enabled: !!token && !!id },
  );

  const save = async (draft: ExerciseDraft) => {
    if (!token) return;
    try {
      await api.updateExercise(token, id, draft);
      router.push(`/app/entrenamiento/gym/ejercicios/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e, "Error al guardar el ejercicio") ?? "Error al guardar el ejercicio");
    }
  };

  if (loading) return <SkeletonCard />;
  // Rendering the editor over a failed read would seed a blank form and then
  // save those blanks over the real exercise.
  if (error || !data) {
    return <ErrorState message={error || "No se pudo cargar el ejercicio"} onRetry={refetch} />;
  }

  const exercise = data.exercise;

  // The API only allows updating your own custom exercises
  // (ExerciseController@update requires is_custom AND ownership), so offering
  // the form for a catalog exercise would just produce a 404 on save.
  if (!exercise.is_custom) {
    return (
      <div>
        <PageHeader title="Editar ejercicio" />
        <Card>
          <p className="text-sm text-muted">
            Este ejercicio es del catálogo y no se puede editar. Solo puedes editar
            los ejercicios que hayas creado tú.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <ExerciseForm
      title="Editar ejercicio"
      subtitle={exercise.name}
      submitLabel="Guardar cambios"
      initial={{
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        equipment: exercise.equipment,
        instructions: exercise.instructions,
        tips: exercise.tips,
      }}
      onSubmit={save}
    />
  );
}
