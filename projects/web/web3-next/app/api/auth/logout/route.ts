import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  // Revocar el token en Laravel (best-effort; se ignoran errores de red).
  if (token) {
    await fetch(`${API_INTERNAL_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ message: "Sesión cerrada" }, { status: 200 });
}
