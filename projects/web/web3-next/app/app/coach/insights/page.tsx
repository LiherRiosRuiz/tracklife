"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function CoachInsightsPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.coachDaily(token!),
    [token],
    { enabled: !!token },
  );

  const insights = data?.insights ?? [];

  return (
    <div>
      <PageHeader title="Insights semanales" />
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && insights.map((i, idx) => (
        <Card key={idx} className="mb-2">
          <span className="text-xs uppercase text-accent">{i.type}</span>
          <p className="mt-1 text-sm">{i.message}</p>
        </Card>
      ))}
    </div>
  );
}
