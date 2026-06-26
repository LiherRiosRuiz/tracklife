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
        } catch {
          localStorage.removeItem(TOKEN_KEY);
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
