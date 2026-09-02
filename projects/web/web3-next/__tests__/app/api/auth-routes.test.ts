// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";

const SESSION_COOKIE = "tracklife_session";

function upstreamResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let setCookieMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setCookieMock = vi.fn();
  vi.mocked(cookies).mockResolvedValue({
    set: setCookieMock,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("auth routes — response body strips token (scope delta, design §4)", () => {
  it("C1: login 200 response body has no token key while the httpOnly cookie is still set", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse({ user: { id: "u1", name: "Ada Lovelace" }, token: "real-sanctum-token" }),
    );

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ada@example.com", password: "secret" }),
    });
    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: { id: "u1", name: "Ada Lovelace" } });
    expect("token" in body).toBe(false);
    expect(setCookieMock).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "real-sanctum-token",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("C2: register 201 response body has no token key while the httpOnly cookie is still set", async () => {
    fetchMock.mockResolvedValue(
      upstreamResponse(
        { user: { id: "u2", name: "Grace Hopper" }, token: "real-sanctum-token-2" },
        { status: 201 },
      ),
    );

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "grace@example.com", password: "secret", name: "Grace Hopper" }),
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ user: { id: "u2", name: "Grace Hopper" } });
    expect("token" in body).toBe(false);
    expect(setCookieMock).toHaveBeenCalledWith(
      SESSION_COOKIE,
      "real-sanctum-token-2",
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
