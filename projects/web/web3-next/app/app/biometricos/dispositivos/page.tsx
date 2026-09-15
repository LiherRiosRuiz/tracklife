"use client";

import { useState } from "react";
import { api, type WearableConnection } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

const providers = ["zepp", "whoop", "garmin", "apple_health", "strava"];

export default function DispositivosPage() {
  const { token } = useAuth();
  const [actionError, setActionError] = useState("");

  const { data, loading, error, refetch } = useApiData(
    () => api.wearables(token!),
    [token],
    { enabled: !!token },
  );

  const connections: WearableConnection[] = data?.connections ?? [];

  const connect = async (provider: string) => {
    if (!token) return;
    setActionError("");
    try {
      await api.connectWearable(token, provider);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo conectar el dispositivo");
    }
  };

  return (
    <div>
      <PageHeader title="Dispositivos" subtitle="Conecta tus wearables" />
      {/* El botón "Sincronizar" se retiró: el endpoint que lo respaldaba fabricaba
          lecturas con rand() y las persistía como datos reales. La integración OAuth
          real no existe todavía; esta página se elimina junto al endpoint. */}
      <Card className="mb-4 border-warning/40">
        <p className="text-sm text-muted">
          La sincronización con wearables todavía no está disponible. Registra tus
          métricas manualmente desde las páginas de biométricos mientras tanto.
        </p>
      </Card>
      {actionError && <p className="mb-3 text-sm text-danger">{actionError}</p>}
      {loading && <SkeletonList count={5} />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-3">
          {providers.map((p) => {
            const conn = connections.find((c) => c.provider === p);
            return (
              <Card key={p}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">{p.replace("_", " ")}</h3>
                    <p className="text-sm text-muted">{conn ? "Conectado" : "No conectado"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => connect(p)} variant="secondary">Conectar</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
