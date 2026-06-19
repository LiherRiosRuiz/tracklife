"use client";

import { api, type Club } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function ClubsPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.clubs(),
    [],
  );

  const clubs: Club[] = data?.clubs ?? [];

  const join = async (id: string) => {
    if (!token) return;
    await api.joinClub(token, id);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Clubs" />
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && clubs.map((c, i) => (
        <Card key={c._id ?? i} className="mb-3">
          <h3 className="font-semibold">{c.name}</h3>
          <p className="mt-1 text-sm text-muted">{c.description}</p>
          <p className="mt-2 text-xs text-muted">{c.member_ids?.length ?? 0} miembros</p>
          <Button onClick={() => join(String(c._id))} className="mt-3" variant="secondary">
            Unirse al club
          </Button>
        </Card>
      ))}
    </div>
  );
}
