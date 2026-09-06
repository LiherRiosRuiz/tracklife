import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

export const dynamic = "force-dynamic";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";
const USER_ID_RE = /^[0-9a-f]{24}$/i; // Mongo ObjectId hex, matches routes/api.php's own shape
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB, generous for a profile picture

/**
 * Streams a user's avatar same-origin instead of letting the browser hit avatar_url
 * directly. avatar_url is free-text with no domain restriction (no upload flow exists),
 * so a raw <img src={avatar_url}> would let any user turn their avatar into a
 * third-party tracking pixel that fires on every viewer's browser, leaking that
 * viewer's IP + timing to a domain of the avatar-setter's choosing. Routing through
 * here means the third party only ever sees this server's own outbound fetch.
 *
 * D1-style closed-by-construction: the destination URL is never client-supplied —
 * it's always looked up server-side from the target user's own stored avatar_url.
 * This is NOT a generic image proxy; it cannot fetch an arbitrary caller-chosen URL.
 */
export async function GET(request: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  if (!USER_ID_RE.test(userId)) {
    return NextResponse.json({ message: "Usuario inválido" }, { status: 400 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let profileRes: Response;
  try {
    profileRes = await fetch(`${API_INTERNAL_URL}/api/users/${userId}/profile`, {
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  if (!profileRes.ok) return new NextResponse(null, { status: 404 });

  const profile = (await profileRes.json().catch(() => null)) as { user?: { avatar_url?: string } } | null;
  const avatarUrl = profile?.user?.avatar_url;
  if (!avatarUrl) return new NextResponse(null, { status: 404 });

  let imageRes: Response;
  try {
    imageRes = await fetch(avatarUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  if (!imageRes.ok) return new NextResponse(null, { status: 502 });

  const contentType = imageRes.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return new NextResponse(null, { status: 502 });

  const contentLength = Number(imageRes.headers.get("content-length") ?? "0");
  if (contentLength > MAX_AVATAR_BYTES) return new NextResponse(null, { status: 502 });

  const bytes = await imageRes.arrayBuffer();
  if (bytes.byteLength > MAX_AVATAR_BYTES) return new NextResponse(null, { status: 502 });

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
