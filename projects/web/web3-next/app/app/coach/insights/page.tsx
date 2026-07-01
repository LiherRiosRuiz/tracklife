"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

// --- Constantes reutilizadas de coach/plan ---

const INSIGHT_COLORS: Record<string, string> = {
  warning: "border-warning/30 bg-warning/10 text-warning",
  success: "border-success/30 bg-success/10 text-accent",
  info:    "border-cyan/30 bg-cyan/10 text-cyan",
};

const INSIGHT_ICONS: Record<string, string> = {
  nutrition: "⚡",
  training:  "🏋️",
  cardio:    "🏃",
  recovery:  "💤",
  general:   "✓",
};

// Etiquetas de severidad para los pills de resumen
const SEVERITY_LABELS: Record<string, string> = {
  warning: "avisos",
  success: "éxitos",
  info:    "informativos",
};

const SEVERITY_PILL: Record<string, string> = {
  warning: "bg-warning/10 text-warning border border-warning/30",
  success: "bg-success/10 text-accent border border-success/30",
  info:    "bg-cyan/10 text-cyan border border-cyan/30",
};

// Categorías de filtro
type Category = "all" | "nutrition" | "training" | "cardio" | "recovery";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all",       label: "Todos" },
  { key: "nutrition", label: "Nutrición" },
  { key: "training",  label: "Entrenamiento" },
  { key: "cardio",    label: "Cardio" },
  { key: "recovery",  label: "Recuperación" },
];

type Insight = { type: string; severity: string; message: string };

export default function CoachInsightsPage() {
  const { token } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const { data, loading, error, refetch } = useApiData(
    () => api.coachDaily(token!),
    [token],
    { enabled: !!token },
  );

  const insights: Insight[] = data?.insights ?? [];

  // --- Sección 1: Conteo por severidad ---
  const countBySeverity = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});

  // --- Sección 2: Filtrado por categoría (client-side) ---
  const filtered = activeCategory === "all"
    ? insights
    : insights.filter((i) => i.type === activeCategory);

  return (
    <div>
      <PageHeader
        title="Insights semanales"
        subtitle="Análisis personalizado basado en tu actividad"
      />

      {/* Navegación del coach */}
      <div className="mb-6 flex gap-2">
        <Button href="/app/coach/insights" variant="primary">Recomendaciones</Button>
        <Button href="/app/coach/plan" variant="secondary">Plan integrado</Button>
      </div>

      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6">

          {/* SECCIÓN 1 — Resumen por severidad */}
          {insights.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Resumen
              </h2>
              <div className="flex flex-wrap gap-2">
                {(["warning", "success", "info"] as const).map((sev) => {
                  const count = countBySeverity[sev];
                  if (!count) return null;
                  return (
                    <span
                      key={sev}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${SEVERITY_PILL[sev]}`}
                    >
                      {count} {SEVERITY_LABELS[sev]}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECCIÓN 2 — Filtro por categoría */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Filtrar por categoría
            </h2>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ key, label }) => {
                const isActive = activeCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-accent text-black"
                        : "border border-border bg-card text-muted hover:border-accent hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN 3 — Lista de insights */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              {activeCategory === "all" ? "Todas las recomendaciones" : CATEGORIES.find(c => c.key === activeCategory)?.label}
            </h2>

            {filtered.length === 0 && insights.length > 0 && (
              <Card>
                <p className="text-sm text-muted">
                  No hay insights en esta categoría.
                </p>
              </Card>
            )}

            {insights.length === 0 && (
              <Card>
                <div className="py-4 text-center">
                  <p className="text-2xl">✓</p>
                  <p className="mt-2 text-sm font-medium text-accent">Todo en orden</p>
                  <p className="mt-1 text-sm text-muted">
                    Sin recomendaciones pendientes hoy. Sigue registrando tu actividad.
                  </p>
                </div>
              </Card>
            )}

            {filtered.map((insight, idx) => {
              const colorClass = INSIGHT_COLORS[insight.severity] ?? INSIGHT_COLORS.info;
              const icon = INSIGHT_ICONS[insight.type] ?? "•";
              const categoryLabel = CATEGORIES.find(c => c.key === insight.type)?.label ?? insight.type;

              return (
                <Card
                  key={idx}
                  className={`mb-3 border ${colorClass}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-base leading-none">
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed">{insight.message}</p>
                      <span className="mt-2 inline-block rounded-md bg-black/20 px-2 py-0.5 text-xs font-medium opacity-70">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>

        </div>
      )}
    </div>
  );
}
