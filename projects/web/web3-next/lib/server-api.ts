import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import type { FeedPost, MacroProgress } from "@/lib/api";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";

export class UnauthenticatedError extends Error {}

async function serverRequest<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw new UnauthenticatedError("No session cookie");

  const res = await fetch(`${API_INTERNAL_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store", // datos por-usuario; leer la cookie ya fuerza render dinámico
  });

  if (res.status === 401) throw new UnauthenticatedError("Token rejected by API");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

// Shape idéntico al tipo inline de api.dashboard en lib/api.ts (verificado).
export type DashboardData = {
  user: { name: string; streak_days: number };
  macros: MacroProgress;
  weekly_calories: Array<{ date: string; day: string; calories: number }>;
  recent_workouts: Array<{
    id: string;
    name: string;
    date: string;
    total_volume: number | null;
    duration_minutes: number | null;
  }>;
  insights: Array<{ type: string; severity: string; message: string }>;
  feed_preview: FeedPost[];
};

export const serverApi = {
  dashboard: () => serverRequest<DashboardData>("/api/dashboard"),
};
