"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

/**
 * Manual entry for a single biometric type.
 *
 * sleep_score, hrv, recovery_score and strain used to have exactly one producer:
 * the wearable sync endpoint, which fabricated them with rand(). With that gone,
 * this is the only honest way those pages hold data.
 */
export function LogBiometricForm({
  type,
  label,
  unit,
  min,
  max,
  onSaved,
}: {
  type: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) {
      setError("Introduce un número válido");
      return;
    }
    if ((min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
      setError(`El valor debe estar entre ${min} y ${max}`);
      return;
    }

    setSaving(true);
    try {
      await api.createBiometric(token, { type, value: parsed, unit });
      setValue("");
      onSaved();
    } catch (err) {
      const msg = toErrorMessage(err, "Error al guardar la medición");
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <form onSubmit={submit}>
        <label className="text-sm text-muted" htmlFor={`log-${type}`}>{label}</label>
        <div className="mt-2 flex gap-2">
          <input
            id={`log-${type}`}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={unit}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={saving}>
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </form>
    </Card>
  );
}
