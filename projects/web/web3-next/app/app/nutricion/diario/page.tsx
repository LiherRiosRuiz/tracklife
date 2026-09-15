"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api, type MealEntry } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  snack: "Merienda",
  dinner: "Cena",
  other: "Snacks",
};

export default function DiarioPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.meals(token!),
    [token],
    { enabled: !!token },
  );

  // Local mirror of the loaded list. Deleting via refetch() would flip useApiData's
  // loading back to true and flash the whole diary to "Cargando…" on every row
  // removed; mutating locally keeps the rest of the page still.
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Re-seeded during render rather than in an effect, matching the pattern already
  // used in nutricion/favoritos: a setState inside useEffect triggers the cascading
  // re-render the react-hooks lint rule flags.
  const [syncedData, setSyncedData] = useState(data);
  if (data !== syncedData) {
    setSyncedData(data);
    if (data?.meals) setMeals(data.meals);
  }

  const remove = async (meal: MealEntry) => {
    if (!token || !meal.id) return;
    if (!confirm("¿Eliminar esta comida del diario?")) return;
    setActionError("");
    setDeletingId(meal.id);
    try {
      await api.deleteMeal(token, meal.id);
      // Removed only after the server confirms. An optimistic removal would tell
      // the user their meal is gone while it is still recorded.
      setMeals((prev) => prev.filter((m) => m.id !== meal.id));
    } catch (e) {
      const msg = toErrorMessage(e, "Error al eliminar la comida");
      if (msg) setActionError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const grouped = meals.reduce<Record<string, MealEntry[]>>((acc, m) => {
    const key = m.meal_type ?? "other";
    acc[key] = acc[key] ?? [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Diario de hoy" subtitle="Tus comidas registradas" />
      <Button href="/app/nutricion/registrar" className="mb-4">+ Añadir comida</Button>
      {actionError && <p className="mb-3 text-sm text-danger">{actionError}</p>}
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && Object.keys(MEAL_LABELS).map((type) => (
        <Card key={type} className="mb-3">
          <h3 className="font-semibold">{MEAL_LABELS[type]}</h3>
          {(grouped[type] ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted">Sin registros</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(grouped[type] ?? []).map((meal, i) => (
                <li key={meal.id ?? i} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {meal.items.map((it) => it.name).join(", ")} — {Math.round(meal.totals?.calories ?? 0)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(meal)}
                    disabled={deletingId === meal.id}
                    aria-label={`Eliminar ${meal.items.map((it) => it.name).join(", ")}`}
                    className="shrink-0 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
