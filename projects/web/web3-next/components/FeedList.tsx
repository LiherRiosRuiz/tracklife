"use client";

import { useState } from "react";
import { Heart, Send } from "lucide-react";
import { api, type FeedPost } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Card } from "./ui";

const MAX_COMMENT_LENGTH = 500; // mirrors StoreFeedCommentRequest's max:500

function CommentBox({
  postId,
  onPosted,
}: {
  postId: string;
  onPosted: (post: FeedPost) => void;
}) {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const trimmed = text.trim();
    if (!token || !trimmed || sending) return;
    setError("");
    setSending(true);
    try {
      const { post } = await api.comment(token, postId, trimmed);
      onPosted(post);
      // Cleared only after the server accepts it; on failure the text stays so
      // the user can retry without retyping.
      setText("");
    } catch (e) {
      const msg = toErrorMessage(e, "Error al publicar el comentario");
      if (msg) setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Escribe un comentario..."
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          aria-label="Enviar comentario"
          className="shrink-0 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-accent disabled:opacity-50"
        >
          <Send size={16} strokeWidth={1.75} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function FeedList({ posts: initial }: { posts: FeedPost[] }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState(initial);
  const [likeError, setLikeError] = useState("");

  const replacePost = (updated: FeedPost) =>
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const handleLike = async (id: string) => {
    if (!token) return;
    setLikeError("");
    try {
      const { post } = await api.like(token, id);
      replacePost(post);
    } catch (err) {
      const msg = toErrorMessage(err, "No se pudo dar like");
      if (msg) setLikeError(msg);
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
            {token && (
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-bg ${post.liked ? "text-danger" : "text-fg-muted"}`}
              >
                <Heart size={16} fill={post.liked ? "currentColor" : "none"} />
                {post.likes_count}
              </button>
            )}
          </div>

          {post.comments?.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-border pt-2">
              {post.comments.map((c, i) => (
                <li key={i} className="text-xs text-fg-muted">
                  <span className="font-semibold text-fg">{c.user_name}</span> {c.text}
                </li>
              ))}
            </ul>
          )}

          {token && <CommentBox postId={post.id} onPosted={replacePost} />}
        </Card>
      ))}
    </div>
  );
}
