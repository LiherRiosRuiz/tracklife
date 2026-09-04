import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_TIMEOUT_MESSAGE, isNotFound, toErrorMessage } from "@/lib/api-error";

/** Reproduce exactamente lo que lanza `request()` en lib/api.ts:117-120. */
function httpError(status: number, message: string): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

describe("toErrorMessage — origen del texto (D5/D6)", () => {
  it("E1: 401 devuelve null (api.ts ya redirige a /login, no debe parpadear un error)", () => {
    expect(toErrorMessage(httpError(401, "Unauthenticated."), "Error al guardar el plan")).toBeNull();
  });

  it("E2: 4xx devuelve el mensaje de la API", () => {
    expect(toErrorMessage(httpError(422, "El nombre es obligatorio"), "Error al guardar el plan"))
      .toBe("El nombre es obligatorio");
  });

  it("E3: los límites 400 y 499 están incluidos", () => {
    expect(toErrorMessage(httpError(400, "Petición inválida"), "fallback")).toBe("Petición inválida");
    expect(toErrorMessage(httpError(499, "Cliente cerró la conexión"), "fallback")).toBe("Cliente cerró la conexión");
  });

  it("E4: 5xx usa el fallback y nunca filtra el statusText en inglés", () => {
    expect(toErrorMessage(httpError(500, "Internal Server Error"), "Error al guardar el plan"))
      .toBe("Error al guardar el plan");
  });

  it("E5: 4xx con mensaje vacío usa el fallback (statusText es \"\" en HTTP/2)", () => {
    expect(toErrorMessage(httpError(404, ""), "Error al cargar el plan")).toBe("Error al cargar el plan");
    expect(toErrorMessage(httpError(403, "   "), "Error al cargar el plan")).toBe("Error al cargar el plan");
  });

  it("E6: el timeout de api.ts devuelve su propio mensaje aunque no tenga status", () => {
    expect(toErrorMessage(new Error(API_TIMEOUT_MESSAGE), "Error al cargar el plan"))
      .toBe(API_TIMEOUT_MESSAGE);
  });

  it("E7: un fallo de red (TypeError sin status) usa el fallback", () => {
    expect(toErrorMessage(new TypeError("Failed to fetch"), "Error al cargar tus planes"))
      .toBe("Error al cargar tus planes");
  });

  it("E8: un Error sin status y con mensaje arbitrario usa el fallback", () => {
    expect(toErrorMessage(new Error("boom"), "Error al iniciar el workout")).toBe("Error al iniciar el workout");
  });

  it("E9: un valor que no es Error usa el fallback", () => {
    expect(toErrorMessage("boom", "Error al actualizar el favorito")).toBe("Error al actualizar el favorito");
    expect(toErrorMessage(null, "Error al actualizar el favorito")).toBe("Error al actualizar el favorito");
    expect(toErrorMessage({ status: 422, message: "x" }, "Error al actualizar el favorito"))
      .toBe("Error al actualizar el favorito");
  });

  it("E10: un 5xx cuyo mensaje coincide con el del timeout NO entra por la rama de timeout", () => {
    expect(toErrorMessage(httpError(500, API_TIMEOUT_MESSAGE), "Error al cargar el plan"))
      .toBe("Error al cargar el plan");
  });

  it("E11: el fallback vacío (canal de detalle de gym/activo) se propaga tal cual", () => {
    expect(toErrorMessage(httpError(500, "Internal Server Error"), "")).toBe("");
    expect(toErrorMessage(httpError(422, "Faltan series"), "")).toBe("Faltan series");
    expect(toErrorMessage(httpError(401, "Unauthenticated."), "")).toBeNull();
  });
});

describe("isNotFound (D4)", () => {
  it("N1: 404 es true", () => expect(isNotFound(httpError(404, "No query results"))).toBe(true));
  it("N2: 500, 401 y 403 son false", () => {
    expect(isNotFound(httpError(500, "Internal Server Error"))).toBe(false);
    expect(isNotFound(httpError(401, "Unauthenticated."))).toBe(false);
    expect(isNotFound(httpError(403, "Forbidden"))).toBe(false);
  });
  it("N3: un error sin status (red/timeout) es false", () => {
    expect(isNotFound(new TypeError("Failed to fetch"))).toBe(false);
    expect(isNotFound(new Error(API_TIMEOUT_MESSAGE))).toBe(false);
  });
  it("N4: un valor que no es Error es false", () => {
    expect(isNotFound({ status: 404 })).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
  });
});

// Guard anti-deriva: si alguien edita el literal del timeout en lib/api.ts,
// API_TIMEOUT_MESSAGE queda obsoleto en silencio. Este test lo hace fallar.
describe("contrato con lib/api.ts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("C1: el error de timeout real de api.ts lo reconoce toErrorMessage", async () => {
    vi.resetModules();
    const abort = new Error("The operation was aborted.");
    abort.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    const { api, SESSION_SENTINEL } = await import("@/lib/api");
    const thrown = await api.workoutPlans(SESSION_SENTINEL).then(
      () => null,
      (e: unknown) => e,
    );

    expect((thrown as Error).message).toBe(API_TIMEOUT_MESSAGE);
    expect((thrown as Error & { status?: number }).status).toBeUndefined();
    expect(toErrorMessage(thrown, "Error al cargar tus planes")).toBe(API_TIMEOUT_MESSAGE);
  });

  it("C2: un 500 real de api.ts con body no-JSON no filtra texto en inglés", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("not json");
        },
      } as unknown as Response),
    );

    const { api, SESSION_SENTINEL } = await import("@/lib/api");
    const thrown = await api.workoutPlans(SESSION_SENTINEL).then(
      () => null,
      (e: unknown) => e,
    );

    expect(toErrorMessage(thrown, "Error al cargar tus planes")).toBe("Error al cargar tus planes");
  });
});

// `beforeEach` sin estado compartido: los helpers son puros; solo C1/C2 tocan globals.
beforeEach(() => {
  vi.restoreAllMocks();
});
