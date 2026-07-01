"use client";

import { useState } from "react";
import { api, type MacroTargets } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, MacroBar, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";
import { macroTargetsSchema } from "@/lib/schemas";

// ── Constantes ─────────────────────────────────────────────────────────────

const DEFAULTS: MacroTargets = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

const FIELD_LABELS: Record<keyof MacroTargets, string> = {
  calories: "Calorías (kcal)",
  protein: "Proteína (g)",
  carbs: "Carbohidratos (g)",
  fat: "Grasa (g)",
};

const FIELD_MINS: Record<keyof MacroTargets, number> = {
  calories: 800,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const MACRO_COLORS: Partial<Record<keyof MacroTargets, string>> = {
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
};

// ── Guía de referencia (estático) ──────────────────────────────────────────

const REFERENCE_GOALS = [
  {
    label: "Perder peso",
    protein: "1.6–2.2 g/kg",
    carbs: "30–40%",
    fat: "25–35%",
    deficit: "−300 a −500 kcal/día",
  },
  {
    label: "Mantener",
    protein: "1.2–1.6 g/kg",
    carbs: "45–55%",
    fat: "25–35%",
    deficit: "TDEE = mantenimiento",
  },
  {
    label: "Ganar masa",
    protein: "1.6–2.2 g/kg",
    carbs: "45–55%",
    fat: "20–30%",
    deficit: "+200 a +400 kcal/día",
  },
];

// ── Componente de distribución ──────────────────────────────────────────────

function MacroDistribution({ targets }: { targets: MacroTargets }) {
  const proteinKcal = targets.protein * 4;
  const carbsKcal = targets.carbs * 4;
  const fatKcal = targets.fat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const pct = (kcal: number) =>
    totalMacroKcal > 0 ? Math.round((kcal / totalMacroKcal) * 100) : 0;

  const proteinPct = pct(proteinKcal);
  const carbsPct = pct(carbsKcal);
  const fatPct = pct(fatKcal);

  return (
    <Card>
      <h3 className="mb-4 font-semibold">Distribución calórica</h3>

      {/* Barra combinada */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-full">
        <div
          className="bg-protein transition-all"
          style={{ width: `${proteinPct}%` }}
          title={`Proteína ${proteinPct}%`}
        />
        <div
          className="bg-carbs transition-all"
          style={{ width: `${carbsPct}%` }}
          title={`Carbohidratos ${carbsPct}%`}
        />
        <div
          className="bg-fat transition-all"
          style={{ width: `${fatPct}%` }}
          title={`Grasa ${fatPct}%`}
        />
      </div>

      {/* Leyenda */}
      <div className="mb-5 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-protein" />
          <span className="text-muted">Proteína</span>
          <span className="font-semibold">{proteinPct}%</span>
          <span className="text-muted">({proteinKcal} kcal)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-carbs" />
          <span className="text-muted">Carbs</span>
          <span className="font-semibold">{carbsPct}%</span>
          <span className="text-muted">({carbsKcal} kcal)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-fat" />
          <span className="text-muted">Grasa</span>
          <span className="font-semibold">{fatPct}%</span>
          <span className="text-muted">({fatKcal} kcal)</span>
        </span>
      </div>

      {/* MacroBar por cada macro */}
      <div className="space-y-3">
        <MacroBar
          label={`Proteína — ${proteinPct}% (${proteinKcal} kcal)`}
          value={proteinKcal}
          target={totalMacroKcal}
          color={MACRO_COLORS.protein}
        />
        <MacroBar
          label={`Carbohidratos — ${carbsPct}% (${carbsKcal} kcal)`}
          value={carbsKcal}
          target={totalMacroKcal}
          color={MACRO_COLORS.carbs}
        />
        <MacroBar
          label={`Grasa — ${fatPct}% (${fatKcal} kcal)`}
          value={fatKcal}
          target={totalMacroKcal}
          color={MACRO_COLORS.fat}
        />
      </div>

      {/* Aviso si la suma difiere mucho de las calorías objetivo */}
      {Math.abs(totalMacroKcal - targets.calories) > 100 && (
        <p className="mt-4 text-xs text-warning">
          La suma calórica de tus macros ({totalMacroKcal} kcal) difiere de tu
          objetivo de calorías ({targets.calories} kcal). Ajusta los valores para
          que coincidan.
        </p>
      )}
    </Card>
  );
}

// ── Formulario principal ────────────────────────────────────────────────────

function PlanForm({ initialTargets, token }: { initialTargets: MacroTargets; token: string }) {
  const [targets, setTargets] = useState<MacroTargets>(initialTargets);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(key: keyof MacroTargets, raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    setTargets((prev) => ({ ...prev, [key]: value }));
    if (status !== "idle") setStatus("idle");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const result = macroTargetsSchema.safeParse(targets);
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setErrorMsg(
        errs.calories?.[0] ??
        errs.protein?.[0] ??
        errs.carbs?.[0] ??
        errs.fat?.[0] ??
        "Datos no válidos"
      );
      setStatus("error");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      await api.updateMacroTargets(token, targets);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Sección 1: Objetivos de macros ── */}
      <form onSubmit={handleSave}>
        <Card>
          <h3 className="mb-4 font-semibold">Objetivos diarios</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm text-muted">
                  {FIELD_LABELS[key]}
                </label>
                <input
                  type="number"
                  min={FIELD_MINS[key]}
                  step={key === "calories" ? 50 : 1}
                  value={targets[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={status === "saving"}>
              {status === "saving" ? "Guardando…" : "Guardar objetivos"}
            </Button>
            {status === "ok" && (
              <span className="text-sm text-accent">Objetivos guardados</span>
            )}
            {status === "error" && (
              <span className="text-sm text-danger">{errorMsg}</span>
            )}
          </div>
        </Card>
      </form>

      {/* ── Sección 2: Distribución en tiempo real ── */}
      <MacroDistribution targets={targets} />

      {/* ── Sección 3: Guía de referencia ── */}
      <Card>
        <h3 className="mb-4 font-semibold">Rangos de referencia</h3>
        <p className="mb-4 text-sm text-muted">
          Orientativo. Ajusta según tu metabolismo, actividad y recomendación profesional.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {REFERENCE_GOALS.map((goal) => (
            <div
              key={goal.label}
              className="rounded-xl border border-border bg-background/50 p-4"
            >
              <p className="mb-3 text-sm font-semibold">{goal.label}</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-protein shrink-0" />
                  <span className="text-muted">Proteína:</span>
                  <span>{goal.protein}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-carbs shrink-0" />
                  <span className="text-muted">Carbs:</span>
                  <span>{goal.carbs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-fat shrink-0" />
                  <span className="text-muted">Grasa:</span>
                  <span>{goal.fat}</span>
                </div>
                <div className="mt-2 border-t border-border pt-2 text-muted">
                  {goal.deficit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────

export default function PlanPage() {
  const { token } = useAuth();

  const { data, loading, error } = useApiData(
    () => api.getMacroTargets(token!),
    [token],
    { enabled: !!token },
  );

  const initialTargets: MacroTargets = data?.targets ?? DEFAULTS;

  if (loading) return <SkeletonCard />;

  return (
    <div>
      <PageHeader
        title="Plan nutricional"
        subtitle="Define tus objetivos y revisa la distribución de macros"
      />

      {error && (
        <p className="mb-4 text-sm text-danger">
          No se pudieron cargar los objetivos actuales: {error}
        </p>
      )}

      {!token ? (
        <Card>
          <p className="text-sm text-muted">Inicia sesión para ver tu plan nutricional.</p>
        </Card>
      ) : (
        <PlanForm initialTargets={initialTargets} token={token} />
      )}
    </div>
  );
}
