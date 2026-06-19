"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Exercise } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Card, PageHeader, Button } from "@/components/ui";
import { SkeletonCard } from "@/components/Skeleton";
import { muscleLabel, equipmentLabel } from "@/lib/muscles";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [showSecondImage, setShowSecondImage] = useState(false);

  const { data, loading, error } = useApiData(
    () => api.exerciseDetail(token!, id),
    [token, id],
    { enabled: !!token && !!id },
  );

  useEffect(() => {
    if (error) router.push("/app/entrenamiento/gym/ejercicios");
  }, [error, router]);

  if (loading) return <SkeletonCard />;
  if (!data?.exercise) return null;

  const exercise: Exercise = data.exercise;
  const secondImageUrl = exercise.image_url?.replace("/0.jpg", "/1.jpg");

  return (
    <div>
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        ← Volver
      </Button>
      <PageHeader title={exercise.name} />
      {exercise.image_url && (
        <Card className="mb-4">
          <img
            src={showSecondImage && secondImageUrl ? secondImageUrl : exercise.image_url}
            alt={exercise.name}
            className="mx-auto h-64 rounded-xl object-contain"
          />
          {secondImageUrl && (
            <button
              onClick={() => setShowSecondImage(!showSecondImage)}
              className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted hover:border-accent transition"
            >
              {showSecondImage ? "Ver posicion inicial" : "Ver posicion final"}
            </button>
          )}
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {exercise.muscle_group && (
          <span className="rounded-full bg-accent-dim px-3 py-1 text-xs font-medium text-accent">
            {muscleLabel(exercise.muscle_group)}
          </span>
        )}
        {exercise.equipment && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            {equipmentLabel(exercise.equipment)}
          </span>
        )}
        {exercise.level && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted capitalize">
            {exercise.level}
          </span>
        )}
        {exercise.force && (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted capitalize">
            {exercise.force}
          </span>
        )}
      </div>
      {(exercise.muscles_primary?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Musculos principales</h2>
          <div className="flex flex-wrap gap-2">
            {exercise.muscles_primary?.map((m) => (
              <span key={m} className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">
                {muscleLabel(m)}
              </span>
            ))}
          </div>
          {(exercise.muscles_secondary?.length ?? 0) > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-medium text-muted">Musculos secundarios</h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscles_secondary?.map((m) => (
                  <span key={m} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {muscleLabel(m)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
      {(exercise.instructions?.length ?? 0) > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Instrucciones</h2>
          <ol className="space-y-3">
            {exercise.instructions?.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-dim text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <span className="text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
