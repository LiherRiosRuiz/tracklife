"use client";

import { api, type Workout } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function ProgresoPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.workouts(token!),
    [token],
    { enabled: !!token },
  );

  const workouts: Workout[] = data?.workouts ?? [];
  const totalVolume = workouts.reduce((s, w) => s + (w.total_volume ?? 0), 0);

  return (
    <div>
      <PageHeader title="Progreso" subtitle={`Volumen total: ${Math.round(totalVolume)} kg`} />
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && workouts.map((w, i) => (
        <Card key={w._id ?? i} className="mb-2">
          <h3 className="font-semibold">{w.name}</h3>
          <p className="text-sm text-muted">{w.sets?.length ?? 0} series — {Math.round(w.total_volume ?? 0)} kg volumen</p>
        </Card>
      ))}
    </div>
  );
}
