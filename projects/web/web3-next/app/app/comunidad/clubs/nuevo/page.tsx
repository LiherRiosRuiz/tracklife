"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export default function NuevoClubPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await api.createClub(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      });
      router.push("/app/comunidad/clubs");
    } catch (err) {
      const msg = toErrorMessage(err, "Error al crear el club");
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nuevo club" subtitle="Crea un espacio para entrenar en grupo" />
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Nombre del club" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Club público
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creando..." : "Crear club"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
