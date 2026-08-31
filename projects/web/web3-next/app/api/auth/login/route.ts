import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-constants";

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

  // data = { user, token }. El token va solo a la cookie httpOnly; nunca al body,
  // o seguiría siendo legible por JS vía res.json() aunque nada lo lea ya.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // dev es http → false, o el navegador descarta la cookie
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  const { token: _token, ...safe } = data;
  return NextResponse.json(safe, { status: 200 });
}
