"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { LogBiometricForm } from "@/components/LogBiometricForm";

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

  return (
    <div>
      <PageHeader title="Corazón" />
      <Card>
        <p className="text-sm text-muted">FC en reposo</p>
        <p className="mt-2 text-3xl font-bold">{hr ? `${hr} bpm` : "—"}</p>
      </Card>
      {/* Was a prompt() with an unguarded await: a failed save did nothing at all
          and said nothing. Same shared form as the other biometric pages now. */}
      <LogBiometricForm
        type="resting_hr"
        label="FC en reposo (bpm)"
        unit="bpm"
        min={20}
        max={220}
        onSaved={refetch}
      />
    </div>
  );
}
