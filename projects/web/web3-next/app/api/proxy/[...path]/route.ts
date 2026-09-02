import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

export const dynamic = "force-dynamic";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";
const UPSTREAM_PREFIX = "/api"; // D1: fixed, never caller-supplied
const SEGMENT_RE = /^[A-Za-z0-9._~-]+$/; // allow-list, not a deny-list
const MAX_SEGMENTS = 8;
const UPSTREAM_TIMEOUT_MS = 10_000;

/** D1: returns the upstream path, or null if any segment is not provably safe. */
function safeUpstreamPath(segments: string[] | undefined): string | null {
  if (!segments || segments.length === 0 || segments.length > MAX_SEGMENTS) return null;
  for (const seg of segments) {
    // Next decodes percent-escapes before we see them, so "%2F" arrives as "/"
    // and "%2e%2e" as ".." — both fail the allow-list / the explicit check below.
    if (!SEGMENT_RE.test(seg)) return null; // rejects "", "/", "\", ":", "@", "?", "#",
    // whitespace, control chars, non-ASCII
    if (seg === "." || seg === "..") return null;
  }
  return `${UPSTREAM_PREFIX}/${segments.join("/")}`;
}

async function proxy(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const upstreamPath = safeUpstreamPath(path);
  // Never echo the rejected path back — no reflection, no log injection.
  if (!upstreamPath) return NextResponse.json({ message: "Ruta de API inválida" }, { status: 400 });

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  // Outbound headers are BUILT, never copied from the inbound request. Any browser-supplied
  // Authorization / Cookie / X-Forwarded-* is therefore dropped by construction (D1).
  const headers: Record<string, string> = { Accept: "application/json" };
  // No cookie → forward unauthenticated. Public endpoints (feed, clubs, challenges,
  // products/barcode, users/:id/profile) must keep working; Laravel decides, not us.
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.text(); // DELETE with a JSON body is real here
    if (raw.length > 0) {
      body = raw;
      headers["Content-Type"] = "application/json";
    }
  }

  const { search } = new URL(request.url); // plain URL, not nextUrl → testable with Request

  let res: Response;
  try {
    res = await fetch(`${API_INTERNAL_URL}${upstreamPath}${search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual", // never chase a redirect off the fixed host
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ message: "Error de API" }, { status: 504 });
  }

  // Status + body verbatim. Response headers are ALLOW-LISTED: Laravel's Set-Cookie,
  // Location or auth headers must never be relayed to the browser.
  const payload = await res.text();
  const nullBody = res.status === 204 || res.status === 304;
  return new NextResponse(nullBody ? null : payload, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
// PATCH / HEAD / OPTIONS are deliberately NOT exported — request() never uses them and
// Next answers 405 automatically. Narrower method surface by default.
