"use client";

import { api, type FeedPost } from "@/lib/api";
import { FeedList } from "@/components/FeedList";
import { Button, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function ComunidadPage() {
  const { data, loading, error, refetch } = useApiData(
    () => api.feed(),
    [],
  );

  const posts: FeedPost[] = data?.feed ?? [];

  return (
    <div>
      <PageHeader title="Comunidad" subtitle="Feed social estilo Strava" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button href="/app/comunidad/retos" variant="secondary">Retos</Button>
        <Button href="/app/comunidad/clubs" variant="secondary">Clubs</Button>
        <Button href="/app/comunidad/buscar" variant="secondary">Buscar</Button>
      </div>
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && <FeedList posts={posts} />}
    </div>
  );
}
