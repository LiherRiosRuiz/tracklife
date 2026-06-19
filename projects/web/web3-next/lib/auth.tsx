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

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await api.login({ email, password });
    persist(t, u);
  };

  const register = async (name: string, email: string, password: string) => {
    const { token: t, user: u } = await api.register({ name, email, password });
    persist(t, u);
  };

  const logout = () => {
    // Llamada silenciosa a la API para revocar el token en servidor.
    // Se ignoran errores de red — el usuario cierra sesión de todas formas.
    const currentToken = token;
    if (currentToken) {
      api.logout(currentToken).catch(() => {});
    }
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
