"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function CorazonPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.biometrics(token!, "resting_hr", 1),
    [token],
    { enabled: !!token },
  );

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const hr = data?.readings[0]?.value ?? null;

  const log = async () => {
    if (!token) return;
    const value = prompt("FC reposo (bpm)", "60");
    if (value) {
      await api.createBiometric(token, { type: "resting_hr", value: Number(value), unit: "bpm" });
      refetch();
    }
  };

  return (
    <div>
      <PageHeader title="Corazón" />
      <Card>
        <p className="text-sm text-muted">FC en reposo</p>
        <p className="mt-2 text-3xl font-bold">{hr ? `${hr} bpm` : "—"}</p>
        <Button onClick={log} className="mt-4" variant="secondary">Registrar manualmente</Button>
      </Card>
    </div>
  );
}
