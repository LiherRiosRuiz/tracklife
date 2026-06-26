import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_INTERNAL_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ message: "Error de API" }));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  // Igual que login: un usuario recién registrado debe quedar con la cookie puesta,
  // o el Server Component del dashboard lo rebotaría a /login en bucle.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json(data, { status: 201 });
}
