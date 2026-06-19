"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";

export default function PerfilPage() {
  const { user, token } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!token) return;
    await api.updateProfile(token, { bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Perfil público" subtitle={`@${user?.username}`} />
      <Card>
        <p className="text-sm text-muted">Nombre</p>
        <p className="font-semibold">{user?.name}</p>
        <p className="mt-3 text-sm text-muted">Bio</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          rows={3}
        />
        <Button onClick={save} className="mt-3">{saved ? "Guardado ✓" : "Guardar perfil"}</Button>
      </Card>
    </div>
  );
}
