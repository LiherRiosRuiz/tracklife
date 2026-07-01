"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Target, Flame, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Brand, Button, Card, Input, Ring, Stat } from "@/components/ui";
import { Celebration } from "@/components/Celebration";

type Step = 0 | 1 | 2 | 3;

export default function OnboardingPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Objetivo
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [deadline, setDeadline] = useState("");

  // Macros (prefill con los del usuario o defaults)
  const [calories, setCalories] = useState("2200");
  const [protein, setProtein] = useState("150");
  const [carbs, setCarbs] = useState("220");
  const [fat, setFat] = useState("70");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Nota: un usuario recién registrado ya trae las macros por defecto del backend
  // (idénticas a los valores iniciales), así que no hace falta sincronizarlas aquí.

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        Cargando...
      </div>
    );
  }

  const finish = () => router.push("/app");

  const saveGoal = async () => {
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      await api.updateProfile(token, {
        transformation_goal: {
          target_weight: Number(weight) || null,
          target_body_fat: Number(bodyFat) || null,
          deadline: deadline || null,
        },
      });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el objetivo");
    } finally {
      setSaving(false);
    }
  };

  const saveMacros = async () => {
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      await api.updateMacroTargets(token, {
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
      });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las macros");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[55vh] w-[55vh] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 70%)" }}
      />
      <div className="relative w-full max-w-md">
        {/* Progreso */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-8 bg-accent" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <Card elevated className="text-center">
            <Brand className="text-3xl" />
            <p className="mt-4 text-fg-muted">
              Bienvenido, <span className="font-semibold text-fg">{user.name.split(" ")[0]}</span>.
              Vamos a preparar tu plan en 2 pasos rápidos.
            </p>
            <div className="mt-6 flex justify-center">
              <Ring value={0.66} size={120}>
                <Sparkles size={28} strokeWidth={1.75} className="text-accent" />
              </Ring>
            </div>
            <div className="mt-8 space-y-3">
              <Button onClick={() => setStep(1)} className="w-full">
                Empezar <ArrowRight size={16} />
              </Button>
              <button onClick={finish} className="w-full text-sm text-fg-subtle hover:text-fg-muted">
                Saltar por ahora
              </button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card elevated>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
                <Target size={20} strokeWidth={1.75} className="text-accent" />
              </span>
              <div>
                <h2 className="font-bold">Tu objetivo</h2>
                <p className="text-sm text-fg-muted">¿Hacia dónde vamos?</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input type="number" inputMode="decimal" placeholder="Peso objetivo (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Input type="number" inputMode="decimal" placeholder="% grasa objetivo (opcional)" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>Atrás</Button>
              <Button onClick={saveGoal} disabled={saving} className="flex-1">
                {saving ? "Guardando..." : "Continuar"} <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card elevated>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
                <Flame size={20} strokeWidth={1.75} className="text-accent" />
              </span>
              <div>
                <h2 className="font-bold">Tus macros diarias</h2>
                <p className="text-sm text-fg-muted">Puedes ajustarlas cuando quieras</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-fg-subtle">Calorías (kcal)
                <Input type="number" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs font-medium text-fg-subtle">Proteína (g)
                <Input type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs font-medium text-fg-subtle">Carbos (g)
                <Input type="number" inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs font-medium text-fg-subtle">Grasas (g)
                <Input type="number" inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} className="mt-1" />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={saveMacros} disabled={saving} className="flex-1">
                {saving ? "Guardando..." : "Continuar"} <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card elevated className="text-center">
            <Celebration />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-dim">
              <Check size={28} strokeWidth={2} className="text-accent" />
            </div>
            <h2 className="text-xl font-extrabold">¡Todo listo!</h2>
            <p className="mt-2 text-fg-muted">
              Tu plan está configurado. Empieza registrando tu primera comida.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <Stat label="Calorías" value={calories} unit="kcal" size="md" />
              <Stat label="Proteína" value={protein} unit="g" size="md" color="var(--color-protein)" />
            </div>
            <div className="mt-8 space-y-3">
              <Button href="/app/nutricion/registrar" className="w-full">
                Registrar primera comida <ArrowRight size={16} />
              </Button>
              <button onClick={finish} className="w-full text-sm text-fg-subtle hover:text-fg-muted">
                Ir al panel
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
