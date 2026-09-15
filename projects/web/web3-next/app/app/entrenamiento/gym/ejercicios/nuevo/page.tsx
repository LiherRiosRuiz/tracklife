"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "@/lib/muscles";

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

function toLines(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

export default function NuevoEjercicioPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  // Explicitly string: the option lists are `as const`, so inference would pin
  // these to the first entry's literal type and reject every other option.
  const [muscleGroup, setMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]?.value ?? "");
  const [equipment, setEquipment] = useState<string>(EQUIPMENT_TYPES[0]?.value ?? "");
  const [instructions, setInstructions] = useState("");
  const [tips, setTips] = useState("");
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
      // Only the fields StoreExerciseRequest accepts. is_custom and user_id are
      // set server-side; sending them would be ignored anyway.
      await api.createExercise(token, {
        name: name.trim(),
        muscle_group: muscleGroup,
        equipment,
        instructions: toLines(instructions),
        tips: toLines(tips),
      });
      router.push("/app/entrenamiento/gym/ejercicios");
    } catch (err) {
      const msg = toErrorMessage(err, "Error al guardar el ejercicio");
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nuevo ejercicio" subtitle="Añade uno que no esté en la biblioteca" />
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
            {saving ? "Guardando..." : "Guardar ejercicio"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
