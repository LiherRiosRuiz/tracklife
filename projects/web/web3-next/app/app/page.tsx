"use client";

import { Flame } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Button, Card, MacroBar, PageHeader } from "@/components/ui";
import { FeedList } from "@/components/FeedList";
import { SkeletonDashboard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function DashboardPage() {
  const { token, user } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.dashboard(token!),
    [token],
    { enabled: !!token },
  );

  if (loading) return <SkeletonDashboard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { macros, insights, feed_preview } = data;

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.name}`}
        subtitle="Resumen de tu día"
      />
      <div className="mb-4 flex items-center gap-2 text-sm text-accent">
        <Flame size={16} />
        Racha: {macros.streak_days} días
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Hoy</h2>
        <MacroBar label="Calorías" value={macros.consumed.calories} target={macros.targets.calories} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MacroBar label="Proteína (g)" value={macros.consumed.protein} target={macros.targets.protein} color="bg-blue-500" />
          <MacroBar label="Carbos (g)" value={macros.consumed.carbs} target={macros.targets.carbs} color="bg-yellow-500" />
          <MacroBar label="Grasas (g)" value={macros.consumed.fat} target={macros.targets.fat} color="bg-orange-500" />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href="/app/nutricion/registrar">+ Registrar comida</Button>
          <Button href="/app/nutricion/escaner" variant="secondary">Escanear producto</Button>
        </div>
      </Card>

      {insights.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Coach</h2>
          {insights.map((i, idx) => (
            <p key={idx} className="text-sm text-muted">{i.message}</p>
          ))}
        </Card>
      )}

      <h2 className="mb-3 font-semibold">Comunidad</h2>
      <FeedList posts={feed_preview} />
    </div>
  );
}
