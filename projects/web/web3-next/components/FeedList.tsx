"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { api, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "./ui";

export function FeedList({ posts: initial, showLikes = true }: { posts: FeedPost[]; showLikes?: boolean }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState(initial);
  const [likeError, setLikeError] = useState("");

  const handleLike = async (id: string) => {
    if (!token) return;
    setLikeError("");
    try {
      const { post } = await api.like(token, id);
      setPosts((prev) => prev.map((p) => (p.id === id ? post : p)));
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : "No se pudo dar like");
    }
  };

  if (posts.length === 0) {
    return <Card><p className="text-sm text-fg-muted">No hay actividad todavía. ¡Sé el primero!</p></Card>;
  }

  return (
    <div className="space-y-3">
      {likeError && <p className="text-xs text-danger">{likeError}</p>}
      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{post.user?.name ?? "Usuario"}</p>
              <p className="mt-1 text-sm text-fg-muted">
                {(post.payload.message as string) ?? post.type}
              </p>
            </div>
            {showLikes && token && (
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-bg ${post.liked ? "text-danger" : "text-fg-muted"}`}
              >
                <Heart size={16} fill={post.liked ? "currentColor" : "none"} />
                {post.likes_count}
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
