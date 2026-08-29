"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing: boolean;
}) {
  const { token } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!token) return;
    setPending(true);
    setError("");
    try {
      const res = following
        ? await api.unfollowUser(token, userId)
        : await api.followUser(token, userId);
      setFollowing(res.following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el seguimiento");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleClick}
        variant={following ? "secondary" : "primary"}
        disabled={pending || !token}
      >
        {following ? "Siguiendo" : "Seguir"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
