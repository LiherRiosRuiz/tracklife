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
  const [msg, setMsg] = useState("");

  const { data, loading, error, refetch } = useApiData(
    () => api.wearables(token!),
    [token],
    { enabled: !!token },
  );

  const connections: WearableConnection[] = data?.connections ?? [];

  const connect = async (provider: string) => {
    if (!token) return;
    await api.connectWearable(token, provider);
    refetch();
  };

  const sync = async (provider: string) => {
    if (!token) return;
    const r = await api.syncWearable(token, provider);
    setMsg(r.message);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Dispositivos" subtitle="Conecta tus wearables" />
      {msg && <p className="mb-3 text-sm text-accent">{msg}</p>}
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
                    <p className="text-sm text-muted">{conn?.status ?? "No conectado"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => connect(p)} variant="secondary">Conectar</Button>
                    {conn && <Button onClick={() => sync(p)}>Sync</Button>}
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
