"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type ActiveWorkoutSet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, Button } from "@/components/ui";
import { RestTimer } from "@/components/RestTimer";

type ExerciseGroup = {
  exercise: string;
  exercise_id: string;
  sets: (ActiveWorkoutSet & { index: number })[];
};

export default function ActiveWorkoutPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [sets, setSets] = useState<ActiveWorkoutSet[]>([]);
  const [workoutName, setWorkoutName] = useState("");
  const [planId, setPlanId] = useState<string | undefined>();
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{ seconds: number; active: boolean }>({
    seconds: 0,
    active: false,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load workout from sessionStorage (one-time mount snapshot from external store)
  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("tracklife_active_workout");
      const storedStart = sessionStorage.getItem("tracklife_workout_start");

      if (!stored) {
        router.push("/app/entrenamiento");
        return;
      }

      try {
        const workout = JSON.parse(stored);
        setSets(workout.sets);
        setWorkoutName(workout.name);
        setPlanId(workout.plan_id);
        setStartTime(storedStart ? Number(storedStart) : Date.now());
        setLoaded(true);
      } catch {
        router.push("/app/entrenamiento");
      }
    }
    load();
  }, [router]);

  // Elapsed time counter
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded, startTime]);

  // Persist workout state to sessionStorage on changes
  useEffect(() => {
    if (!loaded || sets.length === 0) return;
    sessionStorage.setItem(
      "tracklife_active_workout",
      JSON.stringify({ name: workoutName, plan_id: planId, sets, date: new Date().toISOString().slice(0, 10) })
    );
  }, [sets, workoutName, planId, loaded]);

  // Group sets by exercise
  const exerciseGroups: ExerciseGroup[] = [];
  sets.forEach((set, index) => {
    const existing = exerciseGroups.find((g) => g.exercise_id === set.exercise_id);
    if (existing) {
      existing.sets.push({ ...set, index });
    } else {
      exerciseGroups.push({
        exercise: set.exercise,
        exercise_id: set.exercise_id,
        sets: [{ ...set, index }],
      });
    }
  });

  const toggleSet = useCallback(
    (setIndex: number) => {
      setSets((prev) => {
        const updated = [...prev];
        const set = updated[setIndex];
        const wasCompleted = set.completed;
        updated[setIndex] = { ...set, completed: !wasCompleted };

        // Start rest timer when completing a set (not when uncompleting)
        if (!wasCompleted && set.rest_seconds > 0) {
          setRestTimer({ seconds: set.rest_seconds, active: true });
        }

        return updated;
      });
    },
    []
  );

  const updateSetField = (setIndex: number, field: "weight" | "reps", value: number) => {
    setSets((prev) => {
      const updated = [...prev];
      updated[setIndex] = { ...updated[setIndex], [field]: value };
      return updated;
    });
  };

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const finishWorkout = async () => {
    if (!token) return;
    setSaving(true);

    const completedSetData = sets
      .filter((s) => s.completed)
      .map((s, i) => ({
        exercise: s.exercise,
        exercise_id: s.exercise_id,
        set_number: i + 1,
        weight: s.weight,
        reps: s.reps,
        type: s.type,
      }));

    const durationMinutes = Math.round(elapsed / 60);

    try {
      await api.createWorkout(token, {
        name: workoutName,
        sets: completedSetData,
        duration_minutes: durationMinutes,
        shared_to_feed: true,
      });

      sessionStorage.removeItem("tracklife_active_workout");
      sessionStorage.removeItem("tracklife_workout_start");
      router.push("/app/entrenamiento/progreso");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const cancelWorkout = () => {
    if (!confirm("Cancelar el workout? Se perderan los datos.")) return;
    sessionStorage.removeItem("tracklife_active_workout");
    sessionStorage.removeItem("tracklife_workout_start");
    router.push("/app/entrenamiento");
  };

  if (!loaded) return <p className="py-12 text-center text-muted">Cargando...</p>;

  return (
    <div className="pb-24">
      {/* Header with timer and progress */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{workoutName}</h1>
          <p className="text-sm text-muted">{formatTime(elapsed)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent">{progressPct}%</p>
          <p className="text-xs text-muted">
            {completedSets}/{totalSets} series
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Rest timer overlay */}
      {restTimer.active && (
        <RestTimer
          seconds={restTimer.seconds}
          onFinish={() => setRestTimer({ seconds: 0, active: false })}
          onSkip={() => setRestTimer({ seconds: 0, active: false })}
        />
      )}

      {/* Exercise groups */}
      {exerciseGroups.map((group) => (
        <Card key={group.exercise_id} className="mb-4">
          <h3 className="mb-3 font-semibold">{group.exercise}</h3>

          {/* Set header */}
          <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted">
            <span>#</span>
            <span>Kg</span>
            <span>Reps</span>
            <span></span>
          </div>

          {/* Sets */}
          {group.sets.map((set) => (
            <div
              key={set.index}
              className={`mb-1 grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-lg p-1 transition ${
                set.completed ? "bg-accent/10" : ""
              }`}
            >
              <span className={`text-sm ${set.completed ? "text-accent" : "text-muted"}`}>
                {set.set_number}
              </span>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => updateSetField(set.index, "weight", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                disabled={set.completed}
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSetField(set.index, "reps", Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                disabled={set.completed}
              />
              <button
                onClick={() => toggleSet(set.index)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  set.completed
                    ? "border-accent bg-accent text-black"
                    : "border-border text-muted hover:border-accent"
                }`}
              >
                {set.completed ? "✓" : ""}
              </button>
            </div>
          ))}
        </Card>
      ))}

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 md:ml-56">
        <div className="mx-auto flex max-w-5xl gap-3">
          <Button onClick={cancelWorkout} variant="ghost" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={finishWorkout} className="flex-1" disabled={completedSets === 0 || saving}>
            {saving ? "Guardando..." : `Finalizar (${completedSets} series)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
