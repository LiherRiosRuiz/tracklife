"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";

export default function ObjetivoPage() {
  const { token } = useAuth();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [deadline, setDeadline] = useState("");

  const save = async () => {
    if (!token) return;
    await api.updateProfile(token, {
      transformation_goal: {
        target_weight: Number(weight),
        target_body_fat: Number(bodyFat),
        deadline,
      },
    });
    alert("Objetivo guardado");
  };

  return (
    <div>
      <PageHeader title="Objetivo de transformación" />
      <Card>
        <div className="space-y-3">
          <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Peso objetivo (kg)" type="number" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="% grasa objetivo" type="number" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <Button onClick={save} className="w-full">Guardar objetivo</Button>
        </div>
      </Card>
    </div>
  );
}
