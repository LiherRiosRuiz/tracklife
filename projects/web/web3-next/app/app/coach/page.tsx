"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function CoachPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.coachDaily(token!),
    [token],
    { enabled: !!token },
  );

  const insights = data?.insights ?? [];

  const severityColor = (s: string) =>
    s === "warning" ? "text-yellow-400" : s === "success" ? "text-accent" : "text-muted";

  return (
    <div>
      <PageHeader title="Coach de transformación" subtitle="Recomendaciones basadas en tus datos" />
      <div className="mb-4 flex gap-2">
        <Button href="/app/coach/insights" variant="secondary">Insights</Button>
        <Button href="/app/coach/plan" variant="secondary">Plan integrado</Button>
      </div>
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && insights.map((i, idx) => (
        <Card key={idx} className="mb-3">
          <p className={`text-sm ${severityColor(i.severity)}`}>{i.message}</p>
        </Card>
      ))}
    </div>
  );
}
