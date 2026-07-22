"use client";

import { useState } from "react";
import { api, type Challenge } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function RetosPage() {
  const { token } = useAuth();
  const [joinError, setJoinError] = useState("");

  const { data, loading, error, refetch } = useApiData(
    () => api.challenges(),
    [],
  );

  const challenges: Challenge[] = data?.challenges ?? [];

  const join = async (id: string) => {
    if (!token) return;
    setJoinError("");
    try {
      await api.joinChallenge(token, id);
      refetch();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "No se pudo unir al reto");
    }
  };

  return (
    <div>
      <PageHeader title="Retos" />
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {joinError && <p className="mb-3 text-sm text-danger">{joinError}</p>}
      {!loading && !error && challenges.map((c, i) => (
        <Card key={c.id ?? i} className="mb-3">
          <h3 className="font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted">{c.description}</p>
          <p className="mt-2 text-xs text-muted">{c.participant_ids?.length ?? 0} participantes</p>
          <Button onClick={() => join(String(c.id))} className="mt-3" variant="secondary">
            Unirse
          </Button>
        </Card>
      ))}
    </div>
  );
}
