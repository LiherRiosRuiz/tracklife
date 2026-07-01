"use client";

import { useState } from "react";
import { Check, Target } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export default function ObjetivoPage() {
  const { token } = useAuth();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!token) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await api.updateProfile(token, {
        transformation_goal: {
          target_weight: Number(weight) || null,
          target_body_fat: Number(bodyFat) || null,
          deadline: deadline || null,
        },
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el objetivo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Objetivo de transformación" subtitle="Define tu meta y el coach adapta el plan" />
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
            <Target size={20} strokeWidth={1.75} className="text-accent" />
          </span>
          <p className="text-sm text-fg-muted">Puedes actualizarlo cuando quieras.</p>
        </div>
        <div className="space-y-3">
          <Input type="number" inputMode="decimal" placeholder="Peso objetivo (kg)" value={weight} onChange={(e) => { setWeight(e.target.value); setSaved(false); }} />
          <Input type="number" inputMode="decimal" placeholder="% grasa objetivo (opcional)" value={bodyFat} onChange={(e) => { setBodyFat(e.target.value); setSaved(false); }} />
          <Input type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setSaved(false); }} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Guardando..." : saved ? (<><Check size={16} strokeWidth={2} /> Guardado</>) : "Guardar objetivo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
