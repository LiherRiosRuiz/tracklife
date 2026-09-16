"use client";

import { useState } from "react";
import { type Exercise } from "@/lib/api";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "@/lib/muscles";

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

function toLines(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

export type ExerciseDraft = Pick<Exercise, "name" | "muscle_group" | "equipment" | "instructions" | "tips">;

/**
 * Shared by "nuevo ejercicio" and "editar ejercicio". Scoped to exactly the
 * fields StoreExerciseRequest/UpdateExerciseRequest accept — image_url is not
 * among them, so custom exercises have no thumbnail and every render site
 * already guards on that.
 */
export function ExerciseForm({
  title,
  subtitle,
  submitLabel,
  initial,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  initial?: ExerciseDraft;
  onSubmit: (draft: ExerciseDraft) => Promise<void>;
}) {
  // Explicitly string: the option lists are `as const`, so inference would pin
  // these to the first entry's literal type and reject every other option.
  const [name, setName] = useState(initial?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState<string>(
    initial?.muscle_group ?? MUSCLE_GROUPS[0]?.value ?? "",
  );
  const [equipment, setEquipment] = useState<string>(
    initial?.equipment ?? EQUIPMENT_TYPES[0]?.value ?? "",
  );
  const [instructions, setInstructions] = useState((initial?.instructions ?? []).join("\n"));
  const [tips, setTips] = useState((initial?.tips ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        muscle_group: muscleGroup,
        equipment,
        instructions: toLines(instructions),
        tips: toLines(tips),
      });
    } catch (err) {
      // The caller maps the message; it throws so the draft stays on screen
      // instead of the page navigating away with the work lost.
      setError(err instanceof Error ? err.message : "Error al guardar el ejercicio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            aria-label="Grupo muscular"
            className={inputClass}
          >
            {MUSCLE_GROUPS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            aria-label="Equipamiento"
            className={inputClass}
          >
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq.value} value={eq.value}>{eq.label}</option>
            ))}
          </select>
          <textarea
            placeholder="Instrucciones (una por línea)"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            className={inputClass}
          />
          <textarea
            placeholder="Consejos (uno por línea)"
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            rows={3}
            className={inputClass}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : submitLabel}
          </Button>
        </form>
      </Card>
    </div>
  );
}
