"use client";

import { useMemo, useState } from "react";
import { api, type Workout } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, MacroBar, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

// ── helpers ──────────────────────────────────────────────────────────────────

function isoWeekKey(dateStr: string): string {
  // Returns "YYYY-Www" (ISO week)
  const d = new Date(dateStr + "T12:00:00");
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  // "2026-W22" → "Sem 22"
  const parts = key.split("-W");
  return `Sem ${parts[1]}/${parts[0].slice(2)}`;
}

function deriveWorkoutType(workout: Workout): string {
  const types = new Set(workout.sets.map((s) => s.type ?? "normal"));
  if (types.has("dropset")) return "Dropset";
  if (types.has("failure")) return "Al fallo";
  if (types.has("warmup") && types.size === 1) return "Calentamiento";
  return "Fuerza";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

// Consecutive-day streak from an ordered set of date strings (most-recent first)
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => (a < b ? 1 : -1));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak only counts if the user trained today or yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T12:00:00");
    const curr = new Date(unique[i] + "T12:00:00");
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ProgresoPage() {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData(
    () => api.workouts(token!),
    [token],
    { enabled: !!token },
  );

  // Stable base array — avoids useMemo churn
  const workouts = useMemo<Workout[]>(() => data?.workouts ?? [], [data]);

  // ── Sección 1: Resumen global ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((s, w) => s + (w.total_volume ?? 0), 0);

    const datedWorkouts = workouts.filter((w) => !!w.date);
    const dates = datedWorkouts.map((w) => w.date as string);
    const streak = computeStreak(dates);

    const thisWeekKey = isoWeekKey(new Date().toISOString().slice(0, 10));
    const thisWeekCount = datedWorkouts.filter(
      (w) => isoWeekKey(w.date as string) === thisWeekKey,
    ).length;

    return { totalWorkouts, totalVolume, streak, thisWeekCount };
  }, [workouts]);

  // ── Sección 2: Evolución del volumen (últimas 8 semanas) ──────────────────
  const weeklyVolume = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workouts) {
      if (!w.date) continue;
      const key = isoWeekKey(w.date);
      map.set(key, (map.get(key) ?? 0) + (w.total_volume ?? 0));
    }

    const sorted = [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-8);

    return sorted.map(([key, vol], i, arr) => {
      const prev = i > 0 ? arr[i - 1][1] : null;
      const pct = prev != null && prev > 0 ? ((vol - prev) / prev) * 100 : null;
      return { key, vol, pct };
    });
  }, [workouts]);

  const maxWeekVol = useMemo(
    () => Math.max(...weeklyVolume.map((w) => w.vol), 1),
    [weeklyVolume],
  );

  // ── Sección 3: Últimos 10 entrenamientos ──────────────────────────────────
  const recentWorkouts = useMemo(() => workouts.slice(0, 10), [workouts]);

  // ── Sección 4: Ejercicios más frecuentes (Top 5) ──────────────────────────
  const topExercises = useMemo(() => {
    const counter = new Map<string, number>();
    for (const w of workouts) {
      const seen = new Set<string>();
      for (const s of w.sets) {
        if (s.exercise && !seen.has(s.exercise)) {
          seen.add(s.exercise);
          counter.set(s.exercise, (counter.get(s.exercise) ?? 0) + 1);
        }
      }
    }
    return [...counter.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [workouts]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <SkeletonList />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-8">
      <PageHeader title="Progreso" subtitle="Historial de los últimos 30 entrenamientos" />

      {/* ── Sección 1: Resumen global ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Resumen global
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-accent">{stats.totalWorkouts}</p>
            <p className="mt-1 text-xs text-muted">Entrenamientos</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-accent">
              {Math.round(stats.totalVolume).toLocaleString("es-ES")}
            </p>
            <p className="mt-1 text-xs text-muted">Volumen total (kg)</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-accent">{stats.streak}</p>
            <p className="mt-1 text-xs text-muted">Racha (días)</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-accent">{stats.thisWeekCount}</p>
            <p className="mt-1 text-xs text-muted">Esta semana</p>
          </Card>
        </div>
      </section>

      {/* ── Sección 2: Evolución del volumen ──────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Evolución del volumen (últimas 8 semanas)
        </h2>
        <Card>
          {weeklyVolume.length === 0 ? (
            <p className="text-sm text-muted">Sin datos semanales suficientes.</p>
          ) : (
            <div className="space-y-3">
              {weeklyVolume.map(({ key, vol, pct }) => (
                <div key={key}>
                  <MacroBar
                    label={weekLabel(key)}
                    value={Math.round(vol)}
                    target={Math.round(maxWeekVol)}
                    color="bg-accent"
                  />
                  {pct !== null && (
                    <p
                      className={`mt-0.5 text-right text-xs font-medium ${
                        pct >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {pct >= 0 ? "+" : ""}
                      {Math.round(pct)}% vs semana anterior
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── Sección 3: Últimos entrenamientos ─────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Últimos entrenamientos
        </h2>
        <div className="space-y-2">
          {recentWorkouts.length === 0 ? (
            <p className="text-sm text-muted">Sin entrenamientos registrados.</p>
          ) : (
            recentWorkouts.map((w, i) => {
              const id = w._id ?? String(i);
              const isOpen = expanded === id;
              const tipo = deriveWorkoutType(w);
              return (
                <Card key={id} className="cursor-pointer" >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{w.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {w.date ? formatDate(w.date) : "Fecha desconocida"} ·{" "}
                          {w.sets.length} series ·{" "}
                          {Math.round(w.total_volume ?? 0).toLocaleString("es-ES")} kg ·{" "}
                          {tipo}
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 text-muted">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 border-t border-border pt-3">
                      {/* Group sets by exercise */}
                      {[...new Set(w.sets.map((s) => s.exercise))].map((exName) => {
                        const exSets = w.sets.filter((s) => s.exercise === exName);
                        return (
                          <div key={exName} className="mb-3 last:mb-0">
                            <p className="mb-1 text-sm font-medium">{exName}</p>
                            <div className="space-y-1">
                              {exSets.map((s, si) => (
                                <p key={si} className="text-xs text-muted">
                                  Serie {s.set_number ?? si + 1} — {s.weight} kg × {s.reps} reps
                                  {s.type && s.type !== "normal" ? ` (${s.type})` : ""}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {w.duration_minutes != null && (
                        <p className="mt-2 text-xs text-muted">
                          Duración: {w.duration_minutes} min
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* ── Sección 4: Ejercicios más frecuentes ──────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Ejercicios más frecuentes
        </h2>
        <Card>
          {topExercises.length === 0 ? (
            <p className="text-sm text-muted">Sin datos de ejercicios.</p>
          ) : (
            <div className="space-y-3">
              {topExercises.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <MacroBar
                      label={name}
                      value={count}
                      target={topExercises[0][1]}
                      color="bg-accent"
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
