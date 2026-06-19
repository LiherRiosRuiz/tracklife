"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Activity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function CardioPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("Carrera");
  const [distance, setDistance] = useState("5");
  const [duration, setDuration] = useState("30");

  const { data, loading, error, refetch } = useApiData(
    () => api.activities(token!),
    [token],
    { enabled: !!token },
  );

  const activities: Activity[] = data?.activities ?? [];

  const create = async () => {
    if (!token) return;
    await api.createActivity(token, {
      type: "run",
      title,
      distance_km: Number(distance),
      duration_minutes: Number(duration),
      shared_to_feed: true,
    });
    router.refresh();
    refetch();
  };

  return (
    <div>
      <PageHeader title="Cardio" subtitle="Registro manual — GPS próximamente" />
      <Card className="mb-4">
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Km" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Minutos" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <Button onClick={create} className="w-full">Registrar actividad</Button>
        </div>
      </Card>
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && activities.map((a, i) => (
        <Card key={a._id ?? i} className="mb-2">
          <h3 className="font-semibold">{a.title}</h3>
          <p className="text-sm text-muted">{a.distance_km} km — {a.duration_minutes} min</p>
        </Card>
      ))}
    </div>
  );
}
