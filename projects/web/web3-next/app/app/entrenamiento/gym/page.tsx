"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ActiveWorkoutSet, type Exercise } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";

function emptySet(exercise: string, exerciseId: string, num: number): ActiveWorkoutSet {
  return {
    exercise,
    exercise_id: exerciseId,
    set_number: num,
    type: "normal",
    weight: 0,
    reps: 10,
    rest_seconds: 90,
    completed: false,
  };
}

export default function GymPage() {
  const router = useRouter();
  const [name, setName] = useState("Sesion de fuerza");
  const [sets, setSets] = useState<ActiveWorkoutSet[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const addExercise = (ex: Exercise) => {
    const newSets: ActiveWorkoutSet[] = [1, 2, 3].map((n) =>
      emptySet(ex.name, ex._id!, n)
    );
    setSets([...sets, ...newSets]);
    setShowPicker(false);
  };

  const startWorkout = () => {
    if (sets.length === 0) return;

    const workout = {
      name,
      date: new Date().toISOString().slice(0, 10),
      sets,
      duration_minutes: null,
    };

    sessionStorage.setItem("tracklife_active_workout", JSON.stringify(workout));
    sessionStorage.setItem("tracklife_workout_start", Date.now().toString());
    router.push("/app/entrenamiento/gym/activo");
  };

  // Group sets by exercise for display
  const exerciseNames = [...new Set(sets.map((s) => s.exercise))];

  return (
    <div>
      <PageHeader title="Nuevo workout" subtitle="Elige ejercicios y empieza" />

      <Card className="mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del workout"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </Card>

      {exerciseNames.map((exName) => {
        const exSets = sets.filter((s) => s.exercise === exName);
        return (
          <Card key={exName} className="mb-3">
            <h3 className="mb-2 font-semibold">{exName}</h3>
            <p className="text-sm text-muted">{exSets.length} series configuradas</p>
          </Card>
        );
      })}

      <Button onClick={() => setShowPicker(true)} variant="secondary" className="mb-4 w-full">
        + Agregar ejercicio
      </Button>

      {sets.length > 0 && (
        <Button onClick={startWorkout} className="w-full">
          Iniciar Workout ({sets.length} series)
        </Button>
      )}

      {showPicker && (
        <ExercisePickerModal onSelect={addExercise} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
