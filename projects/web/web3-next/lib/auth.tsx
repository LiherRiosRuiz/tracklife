"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, SESSION_SENTINEL, type User } from "./api";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

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
    let cancelled = false;
    // No hay token guardado que consultar: se le pregunta al servidor directamente.
    // La cookie httpOnly viaja sola (same-origin), así que esta es la única forma
    // de saber si hay sesión — ya no hay nada que leer en localStorage.
    (async () => {
      try {
        const { user } = await api.me(SESSION_SENTINEL);
        if (!cancelled) {
          setUser(user);
          setToken(SESSION_SENTINEL);
        }
      } catch {
        // 401 = simplemente no hay sesión (el camino normal para un visitante).
        // 5xx / timeout / red = también "sin sesión para este render"; la cookie
        // httpOnly no se toca, así que un reload lo recupera. api.me() no dispara
        // la redirección global de 401, así que esto nunca puede expulsar a un
        // visitante no autenticado de una página pública — eso lo controla
        // AuthGuard, no este efecto. Sin loop, sin flash.
        if (!cancelled) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (newUser: User) => {
    setToken(SESSION_SENTINEL); // D3: solo un marcador; el token real nunca llega a JS
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({ message: "Error al iniciar sesión" }));
    if (!res.ok) throw new Error(data.message ?? "Error al iniciar sesión");
    persist(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({ message: "Error al registrarse" }));
    if (!res.ok) throw new Error(data.message ?? "Error al registrarse");
    persist(data.user);
  };

  const logout = () => {
    // El route handler de Next revoca el token en Laravel y limpia la cookie httpOnly.
    // Se ignoran errores de red — el usuario cierra sesión de todas formas.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
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
