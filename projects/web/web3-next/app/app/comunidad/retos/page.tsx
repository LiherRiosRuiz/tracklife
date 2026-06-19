"use client";

import { api, type Challenge } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function RetosPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.challenges(),
    [],
  );

  const challenges: Challenge[] = data?.challenges ?? [];

  const join = async (id: string) => {
    if (!token) return;
    await api.joinChallenge(token, id);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Retos" />
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && challenges.map((c, i) => (
        <Card key={c._id ?? i} className="mb-3">
          <h3 className="font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted">{c.description}</p>
          <p className="mt-2 text-xs text-muted">{c.participant_ids?.length ?? 0} participantes</p>
          <Button onClick={() => join(String(c._id))} className="mt-3" variant="secondary">
            Unirse
          </Button>
        </Card>
      ))}
    </div>
  );
}
