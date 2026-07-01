import { redirect } from "next/navigation";
import { Flame, Plus, ScanLine, Dumbbell, Sparkles } from "lucide-react";
import { Badge, Button, Card, MacroBar, PageHeader, Ring, Stat } from "@/components/ui";
import { FeedList } from "@/components/FeedList";
import { WeeklyChart } from "@/components/WeeklyChart";
import { serverApi, UnauthenticatedError } from "@/lib/server-api";

export default async function DashboardPage() {
  let data;
  try {
    data = await serverApi.dashboard();
  } catch (e) {
    // Self-guard server-side: sin cookie (o token rechazado) → al login.
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e; // otros errores → app/app/error.tsx
  }

  const { user, macros, insights, feed_preview, weekly_calories, recent_workouts } = data;

  const target = macros.targets.calories || 1;
  const consumed = Math.round(macros.consumed.calories);
  const remaining = Math.max(0, Math.round(macros.targets.calories - macros.consumed.calories));
  const streak = macros.streak_days ?? 0;

  return (
    <div>
      <PageHeader title={`Hola, ${user.name}`} subtitle="Resumen de tu día" />

      {/* — Hero: anillo de calorías + macros + racha — */}
      <Card elevated className="mb-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-6">
            <Ring value={macros.consumed.calories / target} color="var(--color-accent)">
              <div>
                <p className="tabular text-4xl font-extrabold leading-none">{remaining}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  kcal restantes
                </p>
              </div>
            </Ring>
            <div className="space-y-2">
              <Stat label="Consumidas" value={consumed} unit="kcal" size="md" />
              <p className="tabular text-sm text-fg-muted">Objetivo {macros.targets.calories} kcal</p>
            </div>
          </div>
          {streak > 0 && (
            <Badge tone="accent">
              <Flame size={14} strokeWidth={2} /> Racha {streak} días
            </Badge>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MacroBar label="Proteína (g)" value={macros.consumed.protein} target={macros.targets.protein} color="bg-protein" />
          <MacroBar label="Carbos (g)" value={macros.consumed.carbs} target={macros.targets.carbs} color="bg-carbs" />
          <MacroBar label="Grasas (g)" value={macros.consumed.fat} target={macros.targets.fat} color="bg-fat" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/app/nutricion/registrar">
            <Plus size={16} strokeWidth={2} /> Registrar comida
          </Button>
          <Button href="/app/nutricion/escaner" variant="secondary">
            <ScanLine size={16} strokeWidth={1.75} /> Escanear producto
          </Button>
        </div>
      </Card>

      {weekly_calories && weekly_calories.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Calorías esta semana</h2>
          <WeeklyChart data={weekly_calories} target={macros?.targets?.calories} />
        </Card>
      )}

      {insights.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Sparkles size={18} strokeWidth={1.75} className="text-accent" /> Coach
          </h2>
          <div className="space-y-2">
            {insights.map((i, idx) => (
              <p key={idx} className="text-sm text-fg-muted">{i.message}</p>
            ))}
          </div>
        </Card>
      )}

      {recent_workouts && recent_workouts.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Dumbbell size={18} strokeWidth={1.75} className="text-accent" /> Entrenamientos esta semana
          </h2>
          <div className="divide-y divide-border">
            {recent_workouts.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{w.name}</span>
                <span className="tabular text-fg-muted">
                  {w.total_volume ? `${w.total_volume} kg` : w.date}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <h2 className="mb-3 font-semibold">Comunidad</h2>
      <FeedList posts={feed_preview} />
    </div>
  );
}
