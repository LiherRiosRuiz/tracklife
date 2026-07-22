"use client";

import { useState, useCallback } from "react";
import { api, type Workout, type MealEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Button, Card, PageHeader } from "@/components/ui";

// --- Utilidades de fechas (locales, sin UTC shift) ---

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom..6=Sab
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  snack: "Snack",
  dinner: "Cena",
  other: "Otra",
};

// --- Tipos internos ---

type DayData = {
  workouts: Workout[];
  meals: MealEntry[];
};

type WeekData = Record<string, DayData>;

// --- Componente principal ---

export default function CalendarioPage() {
  const { token } = useAuth();

  const todayKey = toDateKey(new Date());
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const weekDays = getWeekDays(weekMonday);
  const weekKey = toDateKey(weekMonday); // clave para refetch

  // --- Carga de workouts (ultimos 30, filtrar en cliente) ---

  const {
    data: workoutsData,
    loading: loadingWorkouts,
    error: errorWorkouts,
  } = useApiData(
    () => (token ? api.workouts(token) : Promise.reject(new Error("Sin sesion"))),
    [token],
    { enabled: !!token },
  );

  // --- Carga de meals (7 llamadas paralelas, una por dia) ---

  const mealsFetcher = useCallback(async (): Promise<Record<string, MealEntry[]>> => {
    if (!token) throw new Error("Sin sesion");
    const days = getWeekDays(getMondayOfWeek(weekMonday));
    const keys = days.map(toDateKey);
    const results = await Promise.all(keys.map((key) => api.meals(token, key)));
    const map: Record<string, MealEntry[]> = {};
    keys.forEach((key, i) => {
      map[key] = results[i].meals;
    });
    return map;
  }, [token, weekKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: mealsMap,
    loading: loadingMeals,
    error: errorMeals,
  } = useApiData(mealsFetcher, [token, weekKey], { enabled: !!token });

  // --- Construir mapa de la semana ---

  const weekData: WeekData = {};
  for (const day of weekDays) {
    const key = toDateKey(day);
    const dayWorkouts = (workoutsData?.workouts ?? []).filter(
      (w) => String(w.date ?? "").slice(0, 10) === key,
    );
    const dayMeals = mealsMap?.[key] ?? [];
    weekData[key] = { workouts: dayWorkouts, meals: dayMeals };
  }

  // --- Navegacion ---

  const goToPrevWeek = () => {
    setWeekMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setSelectedKey(null);
  };

  const goToNextWeek = () => {
    setWeekMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setSelectedKey(null);
  };

  const goToToday = () => {
    setWeekMonday(getMondayOfWeek(new Date()));
    setSelectedKey(null);
  };

  const loading = loadingWorkouts || loadingMeals;
  const error = errorWorkouts ?? errorMeals;

  // Etiqueta del rango de la semana
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekLabel = `${weekStart.getDate()} — ${weekEnd.getDate()} ${weekEnd.toLocaleString("es", { month: "long" })} ${weekEnd.getFullYear()}`;

  return (
    <div>
      <PageHeader title="Calendario de entreno" subtitle="Vista semanal de workouts y comidas" />

      {/* Controles de navegacion */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button onClick={goToPrevWeek} variant="secondary" className="px-3">
          ← Anterior
        </Button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">{weekLabel}</span>
          <Button onClick={goToToday} variant="ghost" className="text-xs">
            Hoy
          </Button>
        </div>
        <Button onClick={goToNextWeek} variant="secondary" className="px-3">
          Siguiente →
        </Button>
      </div>

      {/* Estado de carga / error */}
      {loading && (
        <Card className="mb-4 text-center text-sm text-muted">
          Cargando semana...
        </Card>
      )}
      {!loading && error && (
        <Card className="mb-4 text-center text-sm text-danger">
          {error}
        </Card>
      )}

      {/* Grid semanal */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day, idx) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const data = weekData[key];
          const hasWorkout = (data?.workouts.length ?? 0) > 0;
          const hasMeals = (data?.meals.length ?? 0) > 0;

          return (
            <button
              key={key}
              onClick={() => setSelectedKey(isSelected ? null : key)}
              className={[
                "flex flex-col items-center rounded-2xl border p-2 sm:p-3 transition cursor-pointer",
                isSelected
                  ? "border-accent bg-accent/10"
                  : isToday
                    ? "border-accent/50 bg-card"
                    : "border-border bg-card hover:border-accent/40",
              ].join(" ")}
            >
              <span className="text-[10px] font-semibold text-muted">{DAY_NAMES[idx]}</span>
              <span
                className={[
                  "mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                  isToday ? "bg-accent text-black" : "text-foreground",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
              {/* Indicadores */}
              <div className="mt-1.5 flex flex-col items-center gap-0.5">
                {hasWorkout && (
                  <span
                    title="Workout registrado"
                    className="inline-block h-2 w-2 rounded-full bg-success"
                  />
                )}
                {hasMeals && (
                  <span
                    title="Comidas registradas"
                    className="inline-block h-2 w-2 rounded-full bg-cyan"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-success" /> Workout
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan" /> Comidas
        </span>
      </div>

      {/* Panel de detalle del dia seleccionado */}
      {selectedKey && (
        <DayDetail
          dateKey={selectedKey}
          day={weekDays.find((d) => toDateKey(d) === selectedKey)!}
          data={weekData[selectedKey]}
        />
      )}
    </div>
  );
}

// --- Panel de detalle ---

function DayDetail({
  dateKey,
  day,
  data,
}: {
  dateKey: string;
  day: Date;
  data: DayData | undefined;
}) {
  const workouts = data?.workouts ?? [];
  const meals = data?.meals ?? [];
  const totalCals = meals.reduce((acc, m) => acc + (m.totals?.calories ?? 0), 0);
  const hasActivity = workouts.length > 0 || meals.length > 0;

  const dayLabel = day.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card className="mt-4">
      <h2 className="mb-4 font-semibold capitalize">{dayLabel}</h2>

      {!hasActivity && (
        <p className="text-sm text-muted">Sin actividad registrada</p>
      )}

      {workouts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-success">
            Workouts ({workouts.length})
          </h3>
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li
                key={w.id ?? dateKey + w.name}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted">
                  {w.sets.length} series
                  {w.total_volume != null && w.total_volume > 0
                    ? ` · ${Math.round(w.total_volume)} kg volumen`
                    : ""}
                  {w.duration_minutes != null
                    ? ` · ${w.duration_minutes} min`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meals.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-cyan">
            Comidas ({meals.length}){totalCals > 0 ? ` · ${Math.round(totalCals)} kcal` : ""}
          </h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <li
                key={m.id ?? m.meal_type}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                <p className="text-sm font-medium">
                  {MEAL_TYPE_LABELS[m.meal_type] ?? m.meal_type}
                </p>
                <p className="text-xs text-muted">
                  {m.items?.length ?? 0} alimentos
                  {m.totals?.calories != null && m.totals.calories > 0
                    ? ` · ${Math.round(m.totals.calories)} kcal`
                    : ""}
                  {m.totals?.protein != null && m.totals.protein > 0
                    ? ` · P: ${Math.round(m.totals.protein)}g`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
