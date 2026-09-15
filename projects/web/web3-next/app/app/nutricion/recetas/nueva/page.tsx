"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, PageHeader } from "@/components/ui";

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

/** One item per line — the API takes arrays, the user types a list. */
function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function NuevaRecetaPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [servings, setServings] = useState("1");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    const ingredientList = toLines(ingredients);
    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (ingredientList.length === 0) {
      // Mirrors StoreRecipeRequest's `ingredients => required|array`, so the
      // user gets a Spanish message instead of a 422 round trip.
      setError("Añade al menos un ingrediente");
      return;
    }

    setSaving(true);
    try {
      await api.createRecipe(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: ingredientList,
        steps: toLines(steps),
        servings: Number(servings) || 1,
        is_public: isPublic,
      });
      router.push("/app/nutricion/recetas");
    } catch (err) {
      const msg = toErrorMessage(err, "Error al guardar la receta");
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nueva receta" subtitle="Compártela con la comunidad o guárdala para ti" />
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
          <textarea
            placeholder="Ingredientes (uno por línea)"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={4}
            className={inputClass}
          />
          <textarea
            placeholder="Pasos (uno por línea)"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            className={inputClass}
          />
          <Input
            type="number"
            placeholder="Raciones"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Visible para la comunidad
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : "Guardar receta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
