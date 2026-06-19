"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { api, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "./ui";

export function FeedList({ posts: initial, showKudos = true }: { posts: FeedPost[]; showKudos?: boolean }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState(initial);

  const handleKudos = async (id: string) => {
    if (!token) return;
    const { post } = await api.kudos(token, id);
    setPosts((prev) => prev.map((p) => (p.id === id ? post : p)));
  };

  if (posts.length === 0) {
    return <Card><p className="text-sm text-muted">No hay actividad todavía. ¡Sé el primero!</p></Card>;
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{post.user?.name ?? "Usuario"}</p>
              <p className="mt-1 text-sm text-muted">
                {(post.payload.message as string) ?? post.type}
              </p>
            </div>
            {showKudos && token && (
              <button
                onClick={() => handleKudos(post.id)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:bg-background"
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
