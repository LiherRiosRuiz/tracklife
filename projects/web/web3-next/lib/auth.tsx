"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "tracklife_token";

// Claves locales asociadas a un usuario concreto. Se limpian en logout() para
// evitar que, en un dispositivo compartido, el siguiente usuario que inicie
// sesion vea brevemente datos residuales del usuario anterior.
// - tracklife_favorites: legacy, en localStorage (ver app/app/nutricion/favoritos/page.tsx).
// - tracklife_active_workout / tracklife_workout_start: en sessionStorage, no
//   localStorage (ver app/app/entrenamiento/gym/activo/page.tsx). sessionStorage
//   no se comparte entre pestanas, pero persiste dentro de la misma pestana tras
//   un logout/login sin recarga completa, por lo que igualmente se limpia aqui.
const LOCAL_STORAGE_USER_KEYS = ["tracklife_favorites"];
const SESSION_STORAGE_USER_KEYS = ["tracklife_active_workout", "tracklife_workout_start"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) {
        try {
          const { user } = await api.me(saved);
          setToken(saved);
          setUser(user);
        } catch (e: unknown) {
          // Only a genuine 401 means the token is actually invalid/expired.
          // Anything else (429 rate-limited, network hiccup, 5xx, timeout)
          // is transient — keep the token and let the user retry, instead
          // of silently logging them out of a perfectly valid session.
          const status = e instanceof Error ? (e as Error & { status?: number }).status : undefined;
          if (status === 401) {
            localStorage.removeItem(TOKEN_KEY);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const persist = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  // login/register pasan por los route handlers same-origin de Next (host app.*),
  // que setean la cookie httpOnly y devuelven { user, token }. El token se sigue
  // guardando en localStorage (dual-write) para compatibilidad con las páginas
  // client que aún leen `token` del contexto. La retirada de localStorage es P5.1.
  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({ message: "Error al iniciar sesión" }));
    if (!res.ok) throw new Error(data.message ?? "Error al iniciar sesión");
    persist(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({ message: "Error al registrarse" }));
    if (!res.ok) throw new Error(data.message ?? "Error al registrarse");
    persist(data.token, data.user);
  };

  const logout = () => {
    // El route handler de Next revoca el token en Laravel y limpia la cookie httpOnly.
    // Se ignoran errores de red — el usuario cierra sesión de todas formas.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    for (const key of LOCAL_STORAGE_USER_KEYS) localStorage.removeItem(key);
    for (const key of SESSION_STORAGE_USER_KEYS) sessionStorage.removeItem(key);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
