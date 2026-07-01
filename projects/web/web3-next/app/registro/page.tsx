"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Brand, Button, Card, Input } from "@/components/ui";
import { registerSchema } from "@/lib/schemas";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({
        name: errs.name?.[0] ?? "",
        email: errs.email?.[0] ?? "",
        password: errs.password?.[0] ?? "",
      });
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
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
