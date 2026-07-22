"use client";

import { api, type MealEntry } from "@/lib/api";
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

  const meals: MealEntry[] = data?.meals ?? [];

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
                <li key={meal.id ?? i} className="text-sm">
                  {meal.items.map((it) => it.name).join(", ")} — {Math.round(meal.totals?.calories ?? 0)} kcal
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
