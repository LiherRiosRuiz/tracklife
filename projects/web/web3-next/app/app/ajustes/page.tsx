"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Público" },
  { value: "followers", label: "Seguidores" },
  { value: "private", label: "Privado" },
];

const PRIVACY_LABELS: Record<string, string> = {
  meals: "Comidas",
  product_scans: "Escaneos de productos",
  progress_photos: "Fotos de progreso",
  biometrics: "Biométricos",
  workouts: "Entrenamientos",
};

const DEFAULT_PRIVACY: Record<string, string> = {
  meals: "followers",
  product_scans: "public",
  progress_photos: "private",
  biometrics: "private",
  workouts: "followers",
};

function mergePrivacy(settings: Record<string, unknown> | undefined): Record<string, string> {
  if (!settings) return DEFAULT_PRIVACY;
  const merged: Record<string, string> = { ...DEFAULT_PRIVACY };
  for (const key of Object.keys(DEFAULT_PRIVACY)) {
    if (typeof settings[key] === "string") {
      merged[key] = settings[key] as string;
    }
  }
  return merged;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

const selectClass =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

// Inner component receives user as non-null prop to allow direct state initialization
function AjustesForm({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState((user as User & { bio?: string }).bio ?? "");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [profileError, setProfileError] = useState("");

  const [privacy, setPrivacy] = useState<Record<string, string>>(
    mergePrivacy(user.privacy_settings as Record<string, unknown> | undefined),
  );
  const [privacyStatus, setPrivacyStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [privacyError, setPrivacyError] = useState("");

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setProfileError("");
    try {
      await api.updateProfile(token, { name: name.trim(), bio: bio.trim() });
      setProfileStatus("ok");
      setTimeout(() => setProfileStatus("idle"), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar");
      setProfileStatus("error");
    }
  }

  async function handlePrivacySave(e: React.FormEvent) {
    e.preventDefault();
    setPrivacyStatus("saving");
    setPrivacyError("");
    try {
      await api.updateProfile(token, { privacy_settings: privacy });
      setPrivacyStatus("ok");
      setTimeout(() => setPrivacyStatus("idle"), 3000);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Error al guardar");
      setPrivacyStatus("error");
    }
  }

  return (
    <>
      {/* ── PERFIL ── */}
      <form onSubmit={handleProfileSave}>
        <Card className="mb-4">
          <h3 className="mb-4 font-semibold">Perfil</h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                className={inputClass}
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Cuéntanos algo sobre ti (opcional)"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted">Usuario</label>
              <input
                type="text"
                value={user.username ?? ""}
                disabled
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">El nombre de usuario no se puede cambiar.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={profileStatus === "saving"}>
              {profileStatus === "saving" ? "Guardando…" : "Guardar perfil"}
            </Button>
            {profileStatus === "ok" && (
              <span className="text-sm text-accent">Cambios guardados</span>
            )}
            {profileStatus === "error" && (
              <span className="text-sm text-red-400">{profileError}</span>
            )}
          </div>
        </Card>
      </form>

      {/* ── PRIVACIDAD ── */}
      <form onSubmit={handlePrivacySave}>
        <Card className="mb-4">
          <h3 className="mb-4 font-semibold">Privacidad</h3>
          <p className="mb-4 text-sm text-muted">
            Controla quién puede ver cada tipo de actividad.
          </p>

          <div className="space-y-4">
            {Object.keys(PRIVACY_LABELS).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm">{PRIVACY_LABELS[key]}</span>
                <select
                  value={privacy[key] ?? "followers"}
                  onChange={(e) =>
                    setPrivacy((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className={`${selectClass} w-40 shrink-0`}
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={privacyStatus === "saving"}>
              {privacyStatus === "saving" ? "Guardando…" : "Guardar privacidad"}
            </Button>
            {privacyStatus === "ok" && (
              <span className="text-sm text-accent">Cambios guardados</span>
            )}
            {privacyStatus === "error" && (
              <span className="text-sm text-red-400">{privacyError}</span>
            )}
          </div>
        </Card>
      </form>

      {/* ── CUENTA ── */}
      <Card>
        <h3 className="mb-4 font-semibold">Cuenta</h3>

        <div className="mb-5">
          <p className="text-sm text-muted">Correo electrónico</p>
          <p className="mt-1 text-sm">{user.email}</p>
        </div>

        <Button
          variant="secondary"
          onClick={onLogout}
          className="border-red-900 text-red-400 hover:border-red-500 hover:text-red-300"
        >
          Cerrar sesión
        </Button>
      </Card>
    </>
  );
}

export default function AjustesPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  if (!user || !token) {
    return (
      <div>
        <PageHeader title="Ajustes" />
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ajustes" />
      <AjustesForm user={user} token={token} onLogout={handleLogout} />
    </div>
  );
}
