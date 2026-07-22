"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { api, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "./ui";

export function FeedList({ posts: initial, showKudos = true }: { posts: FeedPost[]; showKudos?: boolean }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState(initial);
  const [kudosError, setKudosError] = useState("");

  const handleKudos = async (id: string) => {
    if (!token) return;
    setKudosError("");
    try {
      const { post } = await api.kudos(token, id);
      setPosts((prev) => prev.map((p) => (p.id === id ? post : p)));
    } catch (err) {
      setKudosError(err instanceof Error ? err.message : "No se pudo dar kudos");
    }
  };

  if (posts.length === 0) {
    return <Card><p className="text-sm text-fg-muted">No hay actividad todavía. ¡Sé el primero!</p></Card>;
  }

  return (
    <div className="space-y-3">
      {kudosError && <p className="text-xs text-danger">{kudosError}</p>}
      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{post.user?.name ?? "Usuario"}</p>
              <p className="mt-1 text-sm text-fg-muted">
                {(post.payload.message as string) ?? post.type}
              </p>
            </div>
            {showKudos && token && (
              <button
                onClick={() => handleKudos(post.id)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-bg"
              >
                <Heart size={16} />
                {post.kudos_count}
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
