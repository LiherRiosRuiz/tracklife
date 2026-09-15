"use client";

import { useState } from "react";
import { Check, Target } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { SkeletonCard } from "@/components/Skeleton";

type Goal = { target_weight?: number | null; target_body_fat?: number | null; deadline?: string | null };

/** "" for a missing value — an empty input is honest, a 0 would not be. */
function initial(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function ObjetivoForm({ token, goal }: { token: string; goal: Goal }) {
  const { refreshUser } = useAuth();
  // Seeded from the saved goal: rendering an empty form over an existing goal
  // invited the user to silently overwrite it with blanks.
  const [weight, setWeight] = useState(initial(goal.target_weight));
  const [bodyFat, setBodyFat] = useState(initial(goal.target_body_fat));
  const [deadline, setDeadline] = useState(initial(goal.deadline));
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
      // Without this the context keeps the pre-save user, so coach/plan and any
      // other reader show the old goal until a full reload.
      await refreshUser();
    } catch (e) {
      const msg = toErrorMessage(e, "No se pudo guardar el objetivo");
      if (msg) setError(msg);
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

export default function ObjetivoPage() {
  const { user, token, loading } = useAuth();

  // Mounting the form before the user resolves would seed it from an absent goal
  // and then never re-seed — the stale-empty-form bug in a different disguise.
  if (loading || !user || !token) {
    return (
      <div>
        <PageHeader title="Objetivo de transformación" subtitle="Define tu meta y el coach adapta el plan" />
        <SkeletonCard />
      </div>
    );
  }

  const goal = (user.transformation_goal ?? {}) as Goal;
  return <ObjetivoForm token={token} goal={goal} />;
}
