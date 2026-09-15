"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { toMacros } from "@/lib/nutriments";
import { Button, Card, PageHeader } from "@/components/ui";
import { storeMealSchema } from "@/lib/schemas";

export function RegistrarForm() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  // Prefill from the scanner handoff (/app/nutricion/escaner → "Añadir al diario").
  // Reading the params as the initial state keeps a single source of truth: once the
  // user edits a field, the URL no longer overrides it.
  const [name, setName] = useState(params.get("name") ?? "");
  const [calories, setCalories] = useState(params.get("calories") ?? "");
  const [protein, setProtein] = useState(params.get("protein") ?? "");
  const [carbs, setCarbs] = useState(params.get("carbs") ?? "");
  const [fat, setFat] = useState(params.get("fat") ?? "");
  const [mealType, setMealType] = useState("lunch");
  const [share, setShare] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; nutriments?: Record<string, number> }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!token || query.length < 2) return;
    setError("");
    try {
      const { foods } = await api.searchFoods(token, query);
      setResults(foods);
    } catch (e) {
      const msg = toErrorMessage(e, "Error al buscar alimentos");
      if (msg) setError(msg);
    }
  };

  const selectFood = (food: { name: string; nutriments?: Record<string, number> }) => {
    setName(food.name);
    const macros = toMacros(food.nutriments);
    setCalories(String(macros.calories));
    setProtein(String(macros.protein));
    setCarbs(String(macros.carbs));
    setFat(String(macros.fat));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    const payload = {
      meal_type: mealType as "breakfast" | "lunch" | "snack" | "dinner" | "other",
      shared_to_feed: share,
      items: [{
        name,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
      }],
    };

    const result = storeMealSchema.safeParse(payload);
    if (!result.success) {
      const errs = result.error.flatten();
      const itemErr = errs.fieldErrors.items?.[0];
      const nestedErr = errs.fieldErrors.meal_type?.[0];
      setError(itemErr ?? nestedErr ?? result.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    setLoading(true);
    try {
      await api.createMeal(token, payload);
      router.push("/app/nutricion/diario");
    } catch (e) {
      // Previously a bare try/finally: a failed save just stopped the spinner and
      // stayed put, with nothing to tell the user the meal was never recorded.
      const msg = toErrorMessage(e, "Error al guardar la comida");
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Registrar comida" />
      <Card className="mb-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento (Open Food Facts)"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={search} variant="secondary">Buscar</Button>
        </div>
        {results.length > 0 && (
          <ul className="mt-3 max-h-40 overflow-y-auto text-sm">
            {results.map((f, i) => (
              <li key={i}>
                <button type="button" onClick={() => selectFood(f)} className="w-full py-1 text-left hover:text-accent">
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="breakfast">Desayuno</option>
            <option value="lunch">Almuerzo</option>
            <option value="snack">Merienda</option>
            <option value="dinner">Cena</option>
            <option value="other">Snack</option>
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Kcal" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Proteína" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbos" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Grasas" type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Compartir en el feed
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Guardar comida"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
