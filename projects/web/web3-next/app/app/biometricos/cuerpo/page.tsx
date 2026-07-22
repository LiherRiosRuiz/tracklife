"use client";

import { useState } from "react";
import { api, type BiometricReading } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApiData } from "@/hooks/use-api-data";
import { Button, Card, PageHeader } from "@/components/ui";

// ---- tipos locales --------------------------------------------------------

type BodyType = "weight" | "body_fat" | "muscle_mass";

const TYPE_META: Record<BodyType, { label: string; unit: string; placeholder: string }> = {
  weight:      { label: "Peso",              unit: "kg", placeholder: "ej. 78.5" },
  body_fat:    { label: "% Grasa corporal",  unit: "%",  placeholder: "ej. 18.5" },
  muscle_mass: { label: "% Masa muscular",   unit: "%",  placeholder: "ej. 42.0" },
};

const BODY_TYPES: BodyType[] = ["weight", "body_fat", "muscle_mass"];

// ---- helpers ---------------------------------------------------------------

function delta(readings: BiometricReading[], idx: number): string {
  if (idx >= readings.length - 1) return "—";
  const diff = readings[idx].value - readings[idx + 1].value;
  if (Math.abs(diff) < 0.01) return "=";
  return diff > 0 ? `↑ ${diff.toFixed(1)}` : `↓ ${Math.abs(diff).toFixed(1)}`;
}

function deltaColor(readings: BiometricReading[], idx: number): string {
  if (idx >= readings.length - 1) return "text-muted";
  const diff = readings[idx].value - readings[idx + 1].value;
  if (Math.abs(diff) < 0.01) return "text-muted";
  return diff > 0 ? "text-success" : "text-danger";
}

function formatDate(ts: string | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function groupByType(readings: BiometricReading[]): Record<BodyType, BiometricReading[]> {
  const result: Record<BodyType, BiometricReading[]> = {
    weight: [],
    body_fat: [],
    muscle_mass: [],
  };
  for (const r of readings) {
    if (r.type === "weight" || r.type === "body_fat" || r.type === "muscle_mass") {
      result[r.type].push(r);
    }
  }
  return result;
}

// ---- subcomponentes --------------------------------------------------------

function StatusBadge({ status }: { status: "idle" | "saving" | "ok" | "error"; message?: string }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <p className="mt-3 text-sm text-muted animate-pulse">Guardando...</p>
    );
  }
  if (status === "ok") {
    return (
      <p className="mt-3 text-sm text-success">Registrado correctamente.</p>
    );
  }
  return null;
}

function SummaryCard({ type, readings }: { type: BodyType; readings: BiometricReading[] }) {
  const meta = TYPE_META[type];
  const last = readings[0];
  if (!last) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
        <span className="text-xs text-muted">{meta.label}</span>
        <span className="text-lg font-bold text-muted">—</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-xs text-muted">{meta.label}</span>
      <span className="text-2xl font-bold">
        {last.value}
        <span className="ml-1 text-sm font-normal text-muted">{meta.unit}</span>
      </span>
      <span className="text-xs text-muted">{formatDate(last.timestamp)}</span>
    </div>
  );
}

function HistoryTable({ type, readings }: { type: BodyType; readings: BiometricReading[] }) {
  const meta = TYPE_META[type];
  const slice = readings.slice(0, 5);
  if (slice.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold">{meta.label}</h3>
        <p className="text-sm text-muted">Sin registros.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{meta.label}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-1 pr-4 font-normal">Fecha</th>
            <th className="pb-1 pr-4 font-normal">Valor</th>
            <th className="pb-1 font-normal">Delta</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-1.5 pr-4 text-muted">{formatDate(r.timestamp)}</td>
              <td className="py-1.5 pr-4 font-medium">
                {r.value}
                <span className="ml-1 text-xs text-muted">{meta.unit}</span>
              </td>
              <td className={`py-1.5 font-medium ${deltaColor(slice, i)}`}>
                {delta(slice, i)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- pagina principal ------------------------------------------------------

export default function CuerpoPage() {
  const { token } = useAuth();

  // formulario
  const [fields, setFields] = useState<Record<BodyType, string>>({
    weight: "",
    body_fat: "",
    muscle_mass: "",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // historial — 90 dias para tener suficientes entradas
  const {
    data: historialData,
    loading: historialLoading,
    error: historialError,
    refetch,
  } = useApiData(
    () => api.biometrics(token!, undefined, 90),
    [token],
    { enabled: !!token },
  );

  const grouped = historialData ? groupByType(historialData.readings) : null;

  // guardar
  const save = async () => {
    if (!token) return;

    const entries = BODY_TYPES.filter((t) => fields[t].trim() !== "");
    if (entries.length === 0) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await Promise.all(
        entries.map((type) =>
          api.createBiometric(token, {
            type,
            value: Number(fields[type]),
            unit: TYPE_META[type].unit,
          }),
        ),
      );
      setFields({ weight: "", body_fat: "", muscle_mass: "" });
      setSaveStatus("ok");
      refetch();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
      setSaveStatus("error");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Composición corporal"
        subtitle="Peso, grasa y masa muscular"
      />

      {/* ---- Seccion 1: Registrar medicion -------------------------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Registrar medicion</h2>
        <Card className="space-y-4">
          {BODY_TYPES.map((type) => {
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <label className="mb-1 block text-xs text-muted">{meta.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    value={fields[type]}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                    placeholder={meta.placeholder}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <span className="min-w-[2rem] text-sm text-muted">{meta.unit}</span>
                </div>
              </div>
            );
          })}

          <Button
            onClick={save}
            disabled={saveStatus === "saving"}
            className="w-full"
          >
            {saveStatus === "saving" ? "Guardando..." : "Guardar"}
          </Button>

          <StatusBadge status={saveStatus} />
          {saveStatus === "error" && saveError && (
            <p className="text-sm text-danger">{saveError}</p>
          )}
        </Card>
      </section>

      {/* ---- Seccion 3: Resumen (ultima de cada tipo) --------------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Ultimas mediciones</h2>
        {historialLoading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : historialError ? (
          <p className="text-sm text-danger">{historialError}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {BODY_TYPES.map((type) => (
              <SummaryCard
                key={type}
                type={type}
                readings={grouped ? grouped[type] : []}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Seccion 2: Historial reciente -------------------------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Historial reciente</h2>
        {historialLoading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : historialError ? (
          <p className="text-sm text-danger">{historialError}</p>
        ) : (
          <Card className="space-y-6">
            {BODY_TYPES.map((type) => (
              <HistoryTable
                key={type}
                type={type}
                readings={grouped ? grouped[type] : []}
              />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
