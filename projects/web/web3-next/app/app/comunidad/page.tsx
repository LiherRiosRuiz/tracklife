"use client";

import { useState } from "react";
import { api, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FeedList } from "@/components/FeedList";
import { StatusComposer } from "@/components/StatusComposer";
import { Button, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function ComunidadPage() {
  const { token } = useAuth();
  const { data, loading, error, refetch } = useApiData(
    () => api.feed(token!),
    [token],
    { enabled: !!token },
  );

  const [extraPosts, setExtraPosts] = useState<FeedPost[]>([]);

  // Newly composed posts are prepended locally instead of refetching, which
  // would flip loading back to true and blank the whole feed after every post.
  const posts: FeedPost[] = [...extraPosts, ...(data?.feed ?? [])];

  return (
    <div>
      <PageHeader title="Comunidad" subtitle="Feed social estilo Strava" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button href="/app/comunidad/retos" variant="secondary">Retos</Button>
        <Button href="/app/comunidad/clubs" variant="secondary">Clubs</Button>
        <Button href="/app/comunidad/buscar" variant="secondary">Buscar</Button>
      </div>
      {token && <StatusComposer onPosted={(post) => setExtraPosts((prev) => [post, ...prev])} />}
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && <FeedList key={posts.length} posts={posts} />}
    </div>
  );
}
