"use client";

import { Flame } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApiData } from "@/hooks/use-api-data";
import { Button, Card, PageHeader } from "@/components/ui";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function PerfilPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const { data, loading, error, refetch } = useApiData(
    () => api.userProfile(id),
    [id],
    { enabled: !!id },
  );

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { user } = data;

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Miembro de la comunidad" />

      <Card className="flex flex-col items-center gap-4 text-center">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
            {getInitials(user.name)}
          </div>
        )}

        <div>
          <h2 className="text-xl font-black">{user.name}</h2>
          <p className="text-sm text-muted">@{user.username}</p>
        </div>

        {user.bio && <p className="max-w-sm text-sm text-muted">{user.bio}</p>}

        <div className="flex items-center gap-2 text-sm text-accent">
          <Flame size={16} />
          Racha: {user.streak_days} días
        </div>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button href="/app/comunidad/buscar" variant="secondary">
          Volver a buscar
        </Button>
      </div>
    </div>
  );
}
