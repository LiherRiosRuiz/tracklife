// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { DELETE, GET, POST } from "@/app/api/proxy/[...path]/route";

const SESSION_COOKIE = "tracklife_session";
const UPSTREAM_BASE = "http://api-laravel:8000";

type ProxyCtx = { params: Promise<{ path: string[] }> };

function ctxFor(segments: string[]): ProxyCtx {
  return { params: Promise.resolve({ path: segments }) };
}

function withCookie(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === SESSION_COOKIE && token !== undefined ? { value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

function upstreamResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
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

describe("proxy route — path validation (D1 threat matrix)", () => {
  it("R1: empty segment array is rejected with 400 and never calls fetch", async () => {
    const req = new Request("http://localhost/api/proxy/");
    const res = await GET(req, ctxFor([]));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R2: traversal segments ('..' and '.') are rejected", async () => {
    const req = new Request("http://localhost/api/proxy/../etc");
    const res = await GET(req, ctxFor(["..", "etc"]));
    expect(res.status).toBe(400);

    const req2 = new Request("http://localhost/api/proxy/.");
    const res2 = await GET(req2, ctxFor(["."]));
    expect(res2.status).toBe(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R3: an encoded-slash segment ('a/b' from %2F) is rejected", async () => {
    const req = new Request("http://localhost/api/proxy/a%2Fb");
    const res = await GET(req, ctxFor(["a/b"]));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R4: an encoded-backslash segment ('a\\\\b' from %5C) is rejected", async () => {
    const req = new Request("http://localhost/api/proxy/a%5Cb");
    const res = await GET(req, ctxFor(["a\\b"]));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R5: scheme/authority injection via colon-bearing segments is rejected", async () => {
    const req = new Request("http://localhost/api/proxy/http:/evil.com");
    const res = await GET(req, ctxFor(["http:", "", "evil.com"]));
    expect(res.status).toBe(400);

    const req2 = new Request("http://localhost/api/proxy/evil.com:8000");
    const res2 = await GET(req2, ctxFor(["evil.com:8000"]));
    expect(res2.status).toBe(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R6: an absolute-URL segment ('http://evil.com') is rejected", async () => {
    const req = new Request("http://localhost/api/proxy/http://evil.com");
    const res = await GET(req, ctxFor(["http://evil.com"]));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R7: an empty segment (double slash) is rejected", async () => {
    const req = new Request("http://localhost/api/proxy//");
    const res = await GET(req, ctxFor([""]));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R8: a segment-count flood (9 segments) is rejected", async () => {
    const segments = Array.from({ length: 9 }, (_, i) => `seg${i}`);
    const req = new Request(`http://localhost/api/proxy/${segments.join("/")}`);
    const res = await GET(req, ctxFor(segments));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("proxy route — forwarding contract (D1/D2/D3)", () => {
  it("G1: GET with query and a session cookie forwards to the exact upstream URL with Bearer", async () => {
    withCookie("real-session-token");
    fetchMock.mockResolvedValue(upstreamResponse(JSON.stringify({ meals: [] })));

    const req = new Request("http://localhost/api/proxy/meals?date=2026-01-01");
    await GET(req, ctxFor(["meals"]));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${UPSTREAM_BASE}/api/meals?date=2026-01-01`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer real-session-token");
  });

  it("G2: no cookie forwards without an Authorization header (public endpoints keep working)", async () => {
    withCookie(undefined);
    fetchMock.mockResolvedValue(upstreamResponse(JSON.stringify({ feed: [] })));

    const req = new Request("http://localhost/api/proxy/feed");
    await GET(req, ctxFor(["feed"]));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("G3: an inbound client-sent Authorization header is dropped, never relayed", async () => {
    withCookie("real-session-token");
    fetchMock.mockResolvedValue(upstreamResponse(JSON.stringify({ ok: true })));

    const req = new Request("http://localhost/api/proxy/users/me", {
      headers: { Authorization: "Bearer attacker-token" },
    });
    await GET(req, ctxFor(["users", "me"]));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer real-session-token");
  });

  it("G4: DELETE with a JSON body forwards the body and Content-Type", async () => {
    withCookie("real-session-token");
    fetchMock.mockResolvedValue(upstreamResponse(""));

    const payload = JSON.stringify({ ids: [1, 2] });
    const req = new Request("http://localhost/api/proxy/favorites", {
      method: "DELETE",
      body: payload,
    });
    await DELETE(req, ctxFor(["favorites"]));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(payload);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("G5: upstream status and body are returned verbatim (422 validation error)", async () => {
    const upstreamBody = JSON.stringify({ errors: { email: ["required"] } });
    fetchMock.mockResolvedValue(upstreamResponse(upstreamBody, { status: 422 }));

    const req = new Request("http://localhost/api/proxy/meals", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, ctxFor(["meals"]));

    expect(res.status).toBe(422);
    expect(await res.text()).toBe(upstreamBody);
  });

  it("G6: an upstream Set-Cookie header is not relayed to the client", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json", "set-cookie": "evil=1; Path=/" },
      }),
    );

    const req = new Request("http://localhost/api/proxy/meals");
    const res = await GET(req, ctxFor(["meals"]));

    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("G7: an upstream failure (rejected fetch / timeout) returns 504", async () => {
    fetchMock.mockRejectedValue(new Error("upstream timeout"));

    const req = new Request("http://localhost/api/proxy/meals");
    const res = await GET(req, ctxFor(["meals"]));

    expect(res.status).toBe(504);
  });

  it("G8: the route module exports no PATCH handler", async () => {
    const routeModule = await import("@/app/api/proxy/[...path]/route");
    expect((routeModule as Record<string, unknown>).PATCH).toBeUndefined();
  });
});
