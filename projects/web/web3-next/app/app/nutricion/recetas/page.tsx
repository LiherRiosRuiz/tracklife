"use client";

import { api, type Recipe } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonGrid } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function RecetasPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.recipes(token!),
    [token],
    { enabled: !!token },
  );

  const recipes: Recipe[] = data?.recipes ?? [];

  return (
    <div>
      <PageHeader title="Recetas" subtitle="Comunidad TRACKLIFE" />
      {loading && <SkeletonGrid />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        recipes.length === 0 ? (
          <Card><p className="text-sm text-muted">Aún no hay recetas. ¡Comparte la primera!</p></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recipes.map((r, i) => (
              <Card key={r._id ?? i}>
                <h3 className="font-semibold">{r.title}</h3>
                {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
