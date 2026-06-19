"use client";

import { useState } from "react";
import { api, type MacroTargets } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";

const DEFAULTS: MacroTargets = { calories: 2200, protein: 150, carbs: 220, fat: 70 };

export default function MacrosPage() {
  const { token } = useAuth();
  const [overrides, setOverrides] = useState<Partial<MacroTargets>>({});
  const [saved, setSaved] = useState(false);

  const { data, loading } = useApiData(
    () => api.macroProgress(token!),
    [token],
    { enabled: !!token },
  );

  const base: MacroTargets = data?.targets ?? DEFAULTS;
  const targets: MacroTargets = { ...base, ...overrides };

  if (loading) return <SkeletonCard />;

  const save = async () => {
    if (!token) return;
    await api.updateMacroTargets(token, targets);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Objetivos de macros" subtitle="Personaliza tus metas diarias" />
      <Card>
        <div className="space-y-3">
          {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
            <div key={key}>
              <label className="text-sm text-muted capitalize">{key}</label>
              <input
                type="number"
                value={targets[key]}
                onChange={(e) => setOverrides({ ...overrides, [key]: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <Button onClick={save} className="w-full">{saved ? "Guardado ✓" : "Guardar objetivos"}</Button>
        </div>
      </Card>
    </div>
  );
}
