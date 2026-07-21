"use client";

// Los favoritos se gestionan via API (/api/favorites), persistidos por usuario.
// Los candidatos de alimentos se extraen del historial de meals (api.meals).
// Los candidatos de recetas provienen de api.recipes.

import { useState, useMemo, useCallback, useEffect } from "react";
import { api, type MealEntry, type Recipe, type FoodItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

const FAVORITES_KEY = "tracklife_favorites";

type FavoriteEntry = { type: "food"; name: string } | { type: "recipe"; id: string };

// Clave local con prefijo de tipo, usada para el Set de favoritos y para deduplicar en UI.
function favoriteKey(entry: FavoriteEntry): string {
  return entry.type === "food" ? `food:${entry.name}` : `recipe:${entry.id}`;
}

// Referencia cruda (sin prefijo de tipo) que se envia a la API como `ref`.
function entryRef(entry: FavoriteEntry): string {
  return entry.type === "food" ? entry.name : entry.id;
}

// Deduplica items de meals por nombre. Conserva los macros de la primera aparicion y acumula el conteo.
function extractFoodCandidates(meals: MealEntry[]): Array<FoodItem & { count: number }> {
  const map = new Map<string, FoodItem & { count: number }>();
  for (const meal of meals) {
    for (const item of meal.items ?? []) {
      const key = item.name;
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { ...item, count: 1 });
      }
    }
  }
  // Ordenar por frecuencia descendente
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

type AddToDiaryState = "idle" | "loading" | "done" | "error";

export default function FavoritosPage() {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [mealTypeModal, setMealTypeModal] = useState<{ item: FoodItem | null; recipe: Recipe | null } | null>(null);
  const [selectedMealType, setSelectedMealType] = useState("lunch");
  const [addState, setAddState] = useState<AddToDiaryState>("idle");

  const { data: mealsData, loading: loadingMeals, error: errorMeals, refetch: refetchMeals } = useApiData(
    () => api.meals(token!),
    [token],
    { enabled: !!token },
  );

  const { data: recipesData, loading: loadingRecipes, error: errorRecipes, refetch: refetchRecipes } = useApiData(
    () => api.recipes(token!),
    [token],
    { enabled: !!token },
  );

  const { data: favoritesData, loading: loadingFavorites, error: errorFavorites, refetch: refetchFavorites } = useApiData(
    () => api.favorites(token!),
    [token],
    { enabled: !!token },
  );

  // Hidrata el Set local de favoritos desde la API cada vez que llega una lista nueva.
  // Ajuste de estado durante el render (no en un efecto) para evitar el re-render en
  // cascada que produciria un setState dentro de useEffect.
  const [syncedFavoritesData, setSyncedFavoritesData] = useState(favoritesData);
  if (favoritesData !== syncedFavoritesData) {
    setSyncedFavoritesData(favoritesData);
    if (favoritesData) {
      setFavorites(new Set(favoritesData.favorites.map((f) => `${f.type}:${f.ref}`)));
    }
  }

  // Migracion unica: si quedan favoritos guardados en localStorage de la version anterior,
  // los envia a la API (best-effort, sin abortar por un fallo puntual) y limpia la clave local.
  useEffect(() => {
    if (!token) return;
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return;

    let keys: string[];
    try {
      keys = JSON.parse(raw) as string[];
    } catch {
      localStorage.removeItem(FAVORITES_KEY);
      return;
    }

    (async () => {
      const failedKeys: string[] = [];
      for (const key of keys) {
        const i = key.indexOf(":");
        if (i === -1) continue;
        const type = key.slice(0, i) as "food" | "recipe";
        const ref = key.slice(i + 1);
        try {
          await api.addFavorite(token, type, ref);
        } catch (err) {
          const status = (err as Error & { status?: number }).status;
          const isPermanentClientError = status !== undefined && status >= 400 && status < 500;
          if (isPermanentClientError) {
            // error de validacion (4xx): reintentar no lo arreglara nunca (p.ej. un
            // favorito legado con un nombre demasiado largo), se descarta en forma permanente
            console.error(`Favorito "${key}" invalido (status ${status}), se descarta sin reintentar`, err);
            continue;
          }
          // best-effort: un fallo puntual (red, 5xx) no debe abortar el resto de la migracion,
          // pero se conserva la clave para reintentar en la proxima carga (no se pierde el dato)
          console.error(`Fallo al migrar favorito "${key}" a la API`, err);
          failedKeys.push(key);
        }
      }
      if (failedKeys.length > 0) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(failedKeys));
      } else {
        localStorage.removeItem(FAVORITES_KEY);
      }
      refetchFavorites();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const allFoods = useMemo(
    () => extractFoodCandidates(mealsData?.meals ?? []),
    [mealsData],
  );

  const allRecipes: Recipe[] = recipesData?.recipes ?? [];

  const toggle = useCallback((entry: FavoriteEntry) => {
    if (!token) return;
    const key = favoriteKey(entry);
    const wasFav = favorites.has(key);
    const ref = entryRef(entry);

    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFav) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    const request = wasFav
      ? api.removeFavorite(token, entry.type, ref)
      : api.addFavorite(token, entry.type, ref);

    request.catch((err) => {
      // revierte la mutacion optimista si la API falla
      console.error(`Fallo al ${wasFav ? "quitar" : "anadir"} favorito "${key}"`, err);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFav) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    });
  }, [favorites, token]);

  const isFav = (entry: FavoriteEntry) => favorites.has(favoriteKey(entry));

  // Todos los favoritos (sin filtro de busqueda) — para el estado vacio real
  const favFoods = allFoods.filter((f) => isFav({ type: "food", name: f.name }));
  const favRecipes = allRecipes.filter((r) => isFav({ type: "recipe", id: r._id ?? "" }));
  const hasFavorites = favFoods.length > 0 || favRecipes.length > 0;

  // Con filtro de busqueda aplicado
  const filteredFoods = favFoods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRecipes = favRecipes.filter((r) =>
    (r.title ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const noSearchMatch = hasFavorites && filteredFoods.length === 0 && filteredRecipes.length === 0;

  // Candidatos no marcados como favoritos aun — seccion "Mas usados"
  const topFoods = allFoods
    .filter((f) => !isFav({ type: "food", name: f.name }))
    .slice(0, 5);

  const topRecipes = allRecipes
    .filter((r) => !isFav({ type: "recipe", id: r._id ?? "" }))
    .slice(0, 5);

  const openModal = (item?: FoodItem, recipe?: Recipe) => {
    setMealTypeModal({ item: item ?? null, recipe: recipe ?? null });
    setAddState("idle");
    setSelectedMealType("lunch");
  };

  const closeModal = () => {
    setMealTypeModal(null);
    setAddState("idle");
  };

  const addToDiary = async () => {
    if (!token || !mealTypeModal) return;
    setAddState("loading");
    try {
      const today = new Date().toISOString().split("T")[0];
      if (mealTypeModal.item) {
        const f = mealTypeModal.item;
        await api.createMeal(token, {
          meal_type: selectedMealType,
          date: today,
          items: [{
            name: f.name,
            calories: f.calories ?? 0,
            protein: f.protein ?? 0,
            carbs: f.carbs ?? 0,
            fat: f.fat ?? 0,
          }],
        });
      } else if (mealTypeModal.recipe) {
        const r = mealTypeModal.recipe;
        const t = r.totals_per_serving;
        await api.createMeal(token, {
          meal_type: selectedMealType,
          date: today,
          items: [{
            name: r.title,
            calories: t?.calories ?? 0,
            protein: t?.protein ?? 0,
            carbs: t?.carbs ?? 0,
            fat: t?.fat ?? 0,
          }],
        });
      }
      setAddState("done");
    } catch {
      setAddState("error");
    }
  };

  const loading = loadingMeals || loadingRecipes || loadingFavorites;
  const error = errorMeals ?? errorRecipes ?? errorFavorites;
  const refetch = () => { refetchMeals(); refetchRecipes(); refetchFavorites(); };

  return (
    <div>
      <PageHeader
        title="Favoritos"
        subtitle="Productos y recetas guardados"
      />

      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Buscador */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en favoritos..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />

          {/* Favoritos guardados */}
          {!hasFavorites && <EmptyFavorites />}

          {hasFavorites && noSearchMatch && (
            <p className="text-center text-sm text-muted py-6">
              Sin coincidencias para &ldquo;{search}&rdquo;
            </p>
          )}

          {hasFavorites && !noSearchMatch && (
            <>
              {filteredFoods.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wider">
                    Alimentos favoritos
                  </h2>
                  <div className="space-y-2">
                    {filteredFoods.map((food) => (
                      <FoodCard
                        key={food.name}
                        food={food}
                        starred
                        onToggle={() => toggle({ type: "food", name: food.name })}
                        onAdd={() => openModal(food)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredRecipes.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wider">
                    Recetas favoritas
                  </h2>
                  <div className="space-y-2">
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe._id}
                        recipe={recipe}
                        starred
                        onToggle={() => toggle({ type: "recipe", id: recipe._id ?? "" })}
                        onAdd={() => openModal(undefined, recipe)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Sugerencias — items mas usados sin estrella */}
          {(topFoods.length > 0 || topRecipes.length > 0) && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wider">
                Mas usados — pulsa la estrella para guardar
              </h2>
              <div className="space-y-2">
                {topFoods.map((food) => (
                  <FoodCard
                    key={food.name}
                    food={food}
                    starred={false}
                    onToggle={() => toggle({ type: "food", name: food.name })}
                    onAdd={() => openModal(food)}
                  />
                ))}
                {topRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe._id}
                    recipe={recipe}
                    starred={false}
                    onToggle={() => toggle({ type: "recipe", id: recipe._id ?? "" })}
                    onAdd={() => openModal(undefined, recipe)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal: seleccionar tipo de comida */}
      {mealTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-sm">
            <h3 className="mb-4 font-semibold">
              Anadir al diario
            </h3>
            <p className="mb-3 text-sm text-muted">
              {mealTypeModal.item?.name ?? mealTypeModal.recipe?.title}
            </p>
            <select
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="breakfast">Desayuno</option>
              <option value="lunch">Almuerzo</option>
              <option value="snack">Merienda</option>
              <option value="dinner">Cena</option>
              <option value="other">Snack</option>
            </select>
            {addState === "done" && (
              <p className="mb-3 text-sm text-success">Anadido al diario</p>
            )}
            {addState === "error" && (
              <p className="mb-3 text-sm text-danger">Error al anadir — intenta de nuevo</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={addToDiary}
                disabled={addState === "loading" || addState === "done"}
                className="flex-1"
              >
                {addState === "loading" ? "Guardando..." : addState === "done" ? "Anadido" : "Confirmar"}
              </Button>
              <Button variant="secondary" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Sub-componentes ---

function StarButton({ starred, onToggle }: { starred: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-lg leading-none transition hover:scale-110"
      aria-label={starred ? "Quitar de favoritos" : "Anadir a favoritos"}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md bg-border px-1.5 py-0.5 text-xs text-muted">
      {label} {Math.round(value)}
    </span>
  );
}

function FoodCard({
  food,
  starred,
  onToggle,
  onAdd,
}: {
  food: FoodItem & { count?: number };
  starred: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <Card className="flex items-center gap-3">
      <StarButton starred={starred} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{food.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <MacroPill label="kcal" value={food.calories ?? 0} />
          <MacroPill label="prot" value={food.protein ?? 0} />
          <MacroPill label="c" value={food.carbs ?? 0} />
          <MacroPill label="g" value={food.fat ?? 0} />
        </div>
      </div>
      <Button variant="secondary" onClick={onAdd} className="shrink-0 text-xs px-2 py-1">
        + Diario
      </Button>
    </Card>
  );
}

function RecipeCard({
  recipe,
  starred,
  onToggle,
  onAdd,
}: {
  recipe: Recipe;
  starred: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  const t = recipe.totals_per_serving;
  return (
    <Card className="flex items-center gap-3">
      <StarButton starred={starred} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{recipe.title}</p>
        {t ? (
          <div className="mt-1 flex flex-wrap gap-1">
            <MacroPill label="kcal" value={t.calories ?? 0} />
            <MacroPill label="prot" value={t.protein ?? 0} />
            <MacroPill label="c" value={t.carbs ?? 0} />
            <MacroPill label="g" value={t.fat ?? 0} />
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">Macros no disponibles</p>
        )}
      </div>
      <Button variant="secondary" onClick={onAdd} className="shrink-0 text-xs px-2 py-1">
        + Diario
      </Button>
    </Card>
  );
}

function EmptyFavorites() {
  return (
    <Card className="py-10 text-center">
      <p className="text-3xl mb-3">☆</p>
      <p className="font-semibold">Sin favoritos aun</p>
      <p className="mt-1 text-sm text-muted">
        Pulsa la estrella en cualquier alimento o receta para guardarlo aqui.
      </p>
    </Card>
  );
}
