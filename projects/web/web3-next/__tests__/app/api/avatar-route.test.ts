// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { GET } from "@/app/api/avatar/[userId]/route";

const SESSION_COOKIE = "tracklife_session";
const UPSTREAM_BASE = "http://api-laravel:8000";
const VALID_ID = "507f1f77bcf86cd799439011"; // 24 hex chars, matches routes/api.php's own {id} shape

type AvatarCtx = { params: Promise<{ userId: string }> };

function ctxFor(userId: string): AvatarCtx {
  return { params: Promise.resolve({ userId }) };
}

function withCookie(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === SESSION_COOKIE && token !== undefined ? { value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

function profileResponse(avatarUrl: string | null, init: ResponseInit = {}) {
  return new Response(JSON.stringify({ user: { id: VALID_ID, name: "Test", avatar_url: avatarUrl } }), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function imageResponse(byteValues: number[], contentType = "image/jpeg", extraHeaders: Record<string, string> = {}) {
  const buffer = new ArrayBuffer(byteValues.length);
  new Uint8Array(buffer).set(byteValues);
  return new Response(buffer, {
    status: 200,
    headers: { "content-type": contentType, "content-length": String(byteValues.length), ...extraHeaders },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  withCookie(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("avatar route — input validation", () => {
  it("A1: a malformed userId (not 24 hex chars) is rejected with 400, fetch never called", async () => {
    const res = await GET(new Request("http://localhost/api/avatar/not-an-id"), ctxFor("not-an-id"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("A2: an attempted scheme/host injection as userId is rejected with 400", async () => {
    const res = await GET(
      new Request("http://localhost/api/avatar/evil.com"),
      ctxFor("evil.com"),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("avatar route — profile lookup", () => {
  it("A3: forwards the session cookie as Bearer to the exact profile endpoint", async () => {
    withCookie("real-session-token");
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://example.com/a.jpg"))
      .mockResolvedValueOnce(imageResponse([1, 2, 3]));

    await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${UPSTREAM_BASE}/api/users/${VALID_ID}/profile`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer real-session-token");
  });

  it("A4: a failed profile lookup (404) returns 404 and never fetches an image", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("A5: a profile with no avatar_url returns 404 without fetching an image", async () => {
    fetchMock.mockResolvedValueOnce(profileResponse(null));

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("avatar route — image fetch (closed-by-construction destination)", () => {
  it("A6: the image is fetched from exactly the avatar_url the profile lookup returned, never from client input", async () => {
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://cdn.example.com/real-avatar.png"))
      .mockResolvedValueOnce(imageResponse([9, 9]));

    // Client-supplied query string must have zero influence on the fetched destination.
    const req = new Request(`http://localhost/api/avatar/${VALID_ID}?url=https://attacker.com/x`);
    await GET(req, ctxFor(VALID_ID));

    const [imageUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(imageUrl).toBe("https://cdn.example.com/real-avatar.png");
  });

  it("A7: a successful fetch streams the bytes back with the real content-type and a cache header", async () => {
    const byteValues = [1, 2, 3, 4];
    const bytes = new Uint8Array(byteValues);
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://example.com/a.png"))
      .mockResolvedValueOnce(imageResponse(byteValues, "image/png"));

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("max-age");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("A8: a non-image content-type from the external host is rejected with 502, not relayed", async () => {
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://example.com/a"))
      .mockResolvedValueOnce(
        new Response("<html>not an image</html>", { status: 200, headers: { "content-type": "text/html" } }),
      );

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(502);
  });

  it("A9: an oversized Content-Length is rejected with 502 before reading the body", async () => {
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://example.com/huge.jpg"))
      .mockResolvedValueOnce(
        imageResponse([1], "image/jpeg", { "content-length": String(10 * 1024 * 1024) }),
      );

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(502);
  });

  it("A10: an upstream image fetch failure (network error) returns 502, not a crash", async () => {
    fetchMock
      .mockResolvedValueOnce(profileResponse("https://example.com/a.jpg"))
      .mockRejectedValueOnce(new Error("network error"));

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(502);
  });

  it("A11: a rejected profile-lookup fetch (network error) returns 502, not a crash", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    const res = await GET(new Request("http://localhost/api/avatar/" + VALID_ID), ctxFor(VALID_ID));

    expect(res.status).toBe(502);
  });
});
