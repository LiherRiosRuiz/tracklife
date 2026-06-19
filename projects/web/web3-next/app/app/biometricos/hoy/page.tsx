"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonGrid } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

const LABELS: Record<string, string> = {
  recovery_score: "Recuperación",
  strain: "Strain",
  sleep_score: "Sueño",
  hrv: "HRV",
  resting_hr: "FC reposo",
};

export default function BiometricosHoyPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.biometricsToday(token!),
    [token],
    { enabled: !!token },
  );

  const summary = data?.summary ?? {};

  return (
    <div>
      <PageHeader title="Biométricos de hoy" />
      {loading && <SkeletonGrid count={5} />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(LABELS).map(([key, label]) => {
            const biometric = summary[key];
            return (
              <Card key={key}>
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold">
                  {biometric ? `${Math.round(biometric.value)} ${biometric.unit ?? ""}` : "—"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
