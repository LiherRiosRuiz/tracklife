"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";

export default function CuerpoPage() {
  const { token } = useAuth();
  const [weight, setWeight] = useState("");

  const save = async () => {
    if (!token || !weight) return;
    await api.createBiometric(token, { type: "weight", value: Number(weight), unit: "kg" });
    setWeight("");
    alert("Peso registrado");
  };

  return (
    <div>
      <PageHeader title="Composición corporal" subtitle="Peso, medidas y fotos de progreso" />
      <Card>
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Peso (kg)"
          type="number"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <Button onClick={save} className="mt-3 w-full">Registrar peso</Button>
      </Card>
    </div>
  );
}
