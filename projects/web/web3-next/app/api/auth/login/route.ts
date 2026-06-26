import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_INTERNAL_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ message: "Error de API" }));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  // data = { user, token } — el token se setea en cookie httpOnly y también se
  // devuelve en el body para que el AuthContext mantenga el dual-write en localStorage.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // dev es http → false, o el navegador descarta la cookie
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return NextResponse.json(data, { status: 200 });
}
