import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

type ApiModule = typeof import("@/lib/api");

let fetchMock: ReturnType<typeof vi.fn>;

function mockRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

async function loadApi(): Promise<ApiModule> {
  return import("@/lib/api");
}

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("lib/api.ts — meal update and delete", () => {
  it("M1: updateMeal PUTs the payload to the meal's own path", async () => {
    fetchMock.mockResolvedValue(mockRes(200, { meal: { id: "m1" } }));
    const { api } = await loadApi();

    await api.updateMeal("cookie", "m1", { meal_type: "dinner" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/meals/m1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ meal_type: "dinner" });
  });

  it("M2: deleteMeal DELETEs the meal's own path", async () => {
    fetchMock.mockResolvedValue(mockRes(200, { message: "Comida eliminada" }));
    const { api } = await loadApi();

    await api.deleteMeal("cookie", "m1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/meals/m1");
    expect(init.method).toBe("DELETE");
  });

  it("M3: a failed delete rejects rather than resolving silently", async () => {
    fetchMock.mockResolvedValue(mockRes(500, { message: "boom" }));
    const { api } = await loadApi();

    await expect(api.deleteMeal("cookie", "m1")).rejects.toThrow();
  });
});
