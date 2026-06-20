"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card, MacroBar, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

// Tipos de día en el plan semanal del coach
// TODO: reemplazar por endpoint /api/coach/plan cuando se implemente en backend
type DayPlan = {
  day: string;
  label: string;
  type: "strength" | "cardio" | "rest";
  detail: string;
};

const WEEKLY_PLAN: DayPlan[] = [
  { day: "L", label: "Lunes",    type: "strength", detail: "Tren superior — pecho, espalda, hombros" },
  { day: "M", label: "Martes",   type: "cardio",   detail: "Cardio moderado 30 min" },
  { day: "X", label: "Miércoles",type: "strength", detail: "Tren inferior — cuádriceps, isquios, glúteos" },
  { day: "J", label: "Jueves",   type: "rest",     detail: "Descanso activo — movilidad o paseo" },
  { day: "V", label: "Viernes",  type: "strength", detail: "Full body — empuje + tirón + bisagra" },
  { day: "S", label: "Sábado",   type: "cardio",   detail: "Actividad libre — senderismo, ciclismo..." },
  { day: "D", label: "Domingo",  type: "rest",     detail: "Descanso completo — recuperación" },
];

const DAY_COLORS: Record<DayPlan["type"], string> = {
  strength: "bg-accent text-black",
  cardio:   "bg-blue-500 text-white",
  rest:     "bg-border text-muted",
};

const DAY_BADGE: Record<DayPlan["type"], string> = {
  strength: "Fuerza",
  cardio:   "Cardio",
  rest:     "Descanso",
};

const INSIGHT_COLORS: Record<string, string> = {
  warning: "border-yellow-500/40 bg-yellow-950/30 text-yellow-300",
  success: "border-green-500/40 bg-green-950/30 text-accent",
  info:    "border-blue-500/40 bg-blue-950/30 text-blue-300",
};

const INSIGHT_ICONS: Record<string, string> = {
  nutrition: "⚡",
  training:  "🏋️",
  cardio:    "🏃",
  recovery:  "💤",
  general:   "✓",
};

export default function CoachPlanPage() {
  const { token, user } = useAuth();

  const {
    data: insightsData,
    loading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useApiData(
    () => api.coachDaily(token!),
    [token],
    { enabled: !!token },
  );

  const {
    data: progressData,
    loading: progressLoading,
    error: progressError,
  } = useApiData(
    () => api.macroProgress(token!),
    [token],
    { enabled: !!token },
  );

  const insights = insightsData?.insights ?? [];
  const goal = user?.transformation_goal as Record<string, unknown> | undefined;
  const targets = user?.macro_targets;
  const consumed = progressData?.consumed;

  // Días desde deadline para calcular progreso temporal
  const deadline = goal?.deadline as string | undefined;
  const daysRemaining = useMemo(() => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    const ms = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [deadline]);

  const isLoading = insightsLoading || progressLoading;

  return (
    <div>
      <PageHeader
        title="Plan integrado"
        subtitle="Entreno + nutrición basado en tus datos"
      />

      {/* Navegación del coach */}
      <div className="mb-6 flex gap-2">
        <Button href="/app/coach" variant="secondary">Recomendaciones</Button>
        <Button href="/app/coach/plan" variant="primary">Plan integrado</Button>
      </div>

      {isLoading && <SkeletonList />}

      {!isLoading && (
        <div className="space-y-6">

          {/* SECCIÓN 1: Resumen del objetivo */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Tu objetivo
            </h2>
            {goal ? (
              <Card>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-accent">
                      {goal.target_weight ? `${goal.target_weight} kg` : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">Peso objetivo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">
                      {goal.target_body_fat ? `${goal.target_body_fat}%` : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">Grasa objetivo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {daysRemaining !== null ? `${daysRemaining}d` : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {deadline ? new Date(deadline).toLocaleDateString("es-ES", { month: "short", year: "numeric" }) : "Sin fecha"}
                    </p>
                  </div>
                </div>
                {daysRemaining !== null && deadline && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Progreso temporal</span>
                      <span>{daysRemaining} días restantes</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(5, 100 - (daysRemaining / 180) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-muted">
                  Sin objetivo configurado.{" "}
                  <Button href="/app/objetivo" variant="ghost" className="inline px-0 text-accent">
                    Configura tu objetivo
                  </Button>
                </p>
              </Card>
            )}
          </section>

          {/* SECCIÓN 2: Plan nutricional del coach */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Plan nutricional
            </h2>
            <Card>
              {targets ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Objetivo calórico diario</span>
                    <span className="font-semibold text-accent">{targets.calories} kcal</span>
                  </div>
                  {consumed ? (
                    <div className="space-y-3">
                      <MacroBar
                        label="Calorías"
                        value={consumed.calories}
                        target={targets.calories}
                        color="bg-accent"
                      />
                      <MacroBar
                        label="Proteína (g)"
                        value={consumed.protein}
                        target={targets.protein}
                        color="bg-blue-500"
                      />
                      <MacroBar
                        label="Carbohidratos (g)"
                        value={consumed.carbs}
                        target={targets.carbs}
                        color="bg-yellow-500"
                      />
                      <MacroBar
                        label="Grasa (g)"
                        value={consumed.fat}
                        target={targets.fat}
                        color="bg-orange-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Proteína</span>
                        <span>{targets.protein}g / día</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Carbohidratos</span>
                        <span>{targets.carbs}g / día</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Grasa</span>
                        <span>{targets.fat}g / día</span>
                      </div>
                    </div>
                  )}
                  {progressError && (
                    <p className="text-xs text-muted">Sin datos de consumo de hoy.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Sin targets de macros configurados.</p>
              )}
            </Card>
          </section>

          {/* SECCIÓN 3: Plan semanal */}
          {/* TODO: reemplazar datos estáticos por /api/coach/plan cuando exista el endpoint */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Plan semanal
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-border">
                {WEEKLY_PLAN.map((d) => (
                  <div key={d.day} className="flex items-center gap-4 px-5 py-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${DAY_COLORS[d.type]}`}
                    >
                      {d.day}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="truncate text-xs text-muted">{d.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {DAY_BADGE[d.type]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* SECCIÓN 4: Recomendaciones activas del coach */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Recomendaciones del coach
            </h2>
            {insightsError && (
              <ErrorState message={insightsError} onRetry={refetchInsights} />
            )}
            {!insightsError && insights.length === 0 && (
              <Card>
                <p className="text-sm text-muted">Sin recomendaciones activas hoy.</p>
              </Card>
            )}
            {!insightsError && insights.map((insight, idx) => {
              const colorClass = INSIGHT_COLORS[insight.severity] ?? INSIGHT_COLORS.info;
              const icon = INSIGHT_ICONS[insight.type] ?? "•";
              return (
                <Card
                  key={idx}
                  className={`mb-3 border ${colorClass}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-base leading-none">{icon}</span>
                    <p className="text-sm leading-relaxed">{insight.message}</p>
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
