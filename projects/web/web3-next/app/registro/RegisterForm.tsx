"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Brand, Button, Card, Input } from "@/components/ui";
import { registerSchema } from "@/lib/schemas";
import { SITE_URL } from "@/lib/public-urls";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptHealthData, setAcceptHealthData] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = registerSchema.safeParse({ name, email, password, acceptTerms, acceptHealthData });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      // Este objeto se construye clave a clave: un error de zod sobre una clave
      // que NO esté listada aquí se traga en silencio y el botón parece muerto.
      // Si añades un campo al schema, añádelo también aquí.
      setFieldErrors({
        name: errs.name?.[0] ?? "",
        email: errs.email?.[0] ?? "",
        password: errs.password?.[0] ?? "",
        acceptTerms: errs.acceptTerms?.[0] ?? "",
        acceptHealthData: errs.acceptHealthData?.[0] ?? "",
      });
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password, acceptTerms, acceptHealthData });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 70%)" }}
      />
      <Card elevated className="relative w-full max-w-md">
        <Brand className="text-2xl" />
        <p className="mt-2 text-sm text-fg-muted">Crea tu cuenta y empieza tu transformación</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>}
          </div>
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!fieldErrors.email}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
          </div>
          <div>
            <Input
              type="password"
              placeholder="Contraseña (mín. 8)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!fieldErrors.password}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>}
          </div>

          {/* Dos casillas separadas, no una. Los datos de salud son categoría
              especial (RGPD art. 9) y su consentimiento debe ser explícito e
              independiente del contractual que cubren los términos. */}
          <div>
            <label className="flex items-start gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                He leído y acepto los{" "}
                <a href={`${SITE_URL}/terminos`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  términos y condiciones
                </a>{" "}
                y la{" "}
                <a href={`${SITE_URL}/privacidad`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  política de privacidad
                </a>.
              </span>
            </label>
            {fieldErrors.acceptTerms && <p className="mt-1 text-xs text-danger">{fieldErrors.acceptTerms}</p>}
          </div>

          <div>
            <label className="flex items-start gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={acceptHealthData}
                onChange={(e) => setAcceptHealthData(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                Doy mi consentimiento explícito para que TRACKLIFE trate mis{" "}
                <strong className="text-fg">datos de salud</strong> (peso, composición corporal,
                frecuencia cardíaca, sueño y recuperación) con el fin de mostrarme mi progreso
                y recomendaciones.
              </span>
            </label>
            {fieldErrors.acceptHealthData && <p className="mt-1 text-xs text-danger">{fieldErrors.acceptHealthData}</p>}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-fg-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
