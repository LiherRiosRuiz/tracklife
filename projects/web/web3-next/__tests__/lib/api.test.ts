import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ApiModule = typeof import("@/lib/api");

let fetchMock: ReturnType<typeof vi.fn>;
let assignMock: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

/** Minimal fetch Response stand-in — decoupled from environment-specific Response quirks. */
function mockRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/**
 * jsdom 30's `window.location.assign` is a non-configurable own property, so
 * `vi.spyOn(window.location, "assign")` throws `TypeError: Cannot redefine property: assign`
 * under vitest 4 — a vitest-4/jsdom-30 mocking-syntax deviation from the design's implied
 * `vi.spyOn`-style approach. Redefining `window.location` wholesale (a fresh plain object per
 * test) is the working pattern instead; see apply-progress.md for the full note.
 */
function setLocation(pathname: string) {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, pathname, assign: assignMock },
    writable: true,
    configurable: true,
  });
}

/** Fresh module instance per test — `handleUnauthorized`'s module-level `redirecting`
 *  flag (design §5) must not leak across tests, so each test re-imports after resetModules(). */
async function loadApi(): Promise<ApiModule> {
  return import("@/lib/api");
}

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  assignMock = vi.fn();
  setLocation("/dashboard");
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

describe("lib/api.ts — proxy retarget (design §3)", () => {
  it("A1: every api.* call hits /api/proxy/... and never the direct Laravel host", async () => {
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(200, { ok: true }));

    await api.dashboard("token");
    await api.workouts("token");
    await api.userProfile("user-123");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const url = call[0] as string;
      expect(url.startsWith("/api/proxy/")).toBe(true);
      expect(url).not.toContain("api.tracklife.test");
    }
    expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/dashboard");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/proxy/workouts");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/proxy/users/user-123/profile");
  });

  it("A2: no Authorization header is ever produced, even when a token argument is passed", async () => {
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(200, { targets: {} }));

    await api.getMacroTargets("a-real-looking-token-value");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(init.credentials).toBe("same-origin");
  });
});

describe("lib/api.ts — global 401 redirect (design §5)", () => {
  it("A3: a 401 on a normal call redirects to /login", async () => {
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(401, { message: "Unauthenticated." }));

    await expect(api.dashboard("token")).rejects.toThrow();

    expect(assignMock).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  it("A4: a 401 from api.me does not navigate (bootstrap probe, not a session-loss event)", async () => {
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(401, { message: "Unauthenticated." }));

    await expect(api.me("cookie")).rejects.toThrow();

    expect(assignMock).not.toHaveBeenCalled();
  });

  it("A5: a 401 while already on /login does not navigate (no loop)", async () => {
    setLocation("/login");
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(401, { message: "Unauthenticated." }));

    await expect(api.dashboard("token")).rejects.toThrow();

    expect(assignMock).not.toHaveBeenCalled();
  });

  it("A6: two concurrent 401s navigate exactly once", async () => {
    const { api } = await loadApi();
    fetchMock.mockResolvedValue(mockRes(401, { message: "Unauthenticated." }));

    const results = await Promise.allSettled([api.dashboard("token"), api.workouts("token")]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(assignMock).toHaveBeenCalledTimes(1);
  });
});
