"use client";

import { useState } from "react";
import { api, type FeedPost } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

const MAX_LENGTH = 500; // mirrors StoreFeedPostRequest's payload.message max:500

/**
 * Text-only on purpose. The feed's other post types (workouts, meals, scans…)
 * carry metrics and are created server-side from records that actually exist —
 * a client-side composer for those would publish numbers nothing can back.
 */
export function StatusComposer({ onPosted }: { onPosted: (post: FeedPost) => void }) {
  const { token } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!token || !trimmed || sending) return;
    setError("");
    setSending(true);
    try {
      const { post } = await api.createStatusPost(token, trimmed);
      onPosted(post);
      setMessage("");
    } catch (err) {
      const msg = toErrorMessage(err, "Error al publicar");
      if (msg) setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mb-4">
      <form onSubmit={submit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder="¿Cómo va tu entrenamiento?"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-fg-subtle">{message.length}/{MAX_LENGTH}</span>
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? "Publicando..." : "Publicar"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </form>
    </Card>
  );
}
