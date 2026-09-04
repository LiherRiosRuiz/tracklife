# Design: Surface silent API failures to the user (web3-next)

## 0. Verified error shape in `lib/api.ts` (foundational — read, not assumed)

Read at `projects/web/web3-next/lib/api.ts`, 2026-09-04. Three thrown shapes exist:

| Origin | Line | Thrown value | `.name` | `.status` | `.message` |
|---|---|---|---|---|---|
| HTTP failure | 117-120 | `new Error(err.message ?? "Error de API")` cast to `Error & { status?: number }`, then `error.status = res.status` | `"Error"` | the real HTTP status | JSON body `message`, else `res.statusText`, else `"Error de API"` |
| Client timeout | 105-109 | `new Error("La petición tardó demasiado (timeout 10s)")` | `"Error"` | **`undefined`** | that exact literal |
| Network / other | 110 | whatever `fetch` rejected with (usually `TypeError("Failed to fetch")`) | `"TypeError"` | `undefined` | browser text |

Three consequences that the proposal's paraphrase did **not** capture and that drive the design:

1. **The timeout error is NOT an `AbortError`.** `api.ts` catches the `AbortError` and rethrows a *new,
   plain* `Error`. Its `name` is `"Error"`. So a `name`-based discriminator (D6's "e.g. by name/message
   shape") is impossible. The only available discriminator is `status === undefined && message === <exact literal>`.
2. **`err.message ?? "Error de API"` uses `??`, not `||`.** `res.statusText` is `""` on HTTP/2 (and the
   project's own test double already sets `statusText: ""`, `__tests__/lib/api.test.ts:14`), so a
   non-JSON 4xx can produce `new Error("")`. A naive "4xx → return `e.message`" would render an
   **empty** error box. `toErrorMessage` therefore requires a non-empty trimmed message.
3. **`handleUnauthorized()` runs before the throw** (line 116), so the 401 catch always fires mid-navigation
   — D5 is required, not cosmetic.

## Technical Approach

One new pure module (`lib/api-error.ts`) holds the whole decision table; the five pages only add local
state and JSX using the two existing render conventions (`<p className="text-sm text-danger">` and
`<ErrorState>`). No new component, no dependency, no hook migration (D3). Implements
`specs/client-error-feedback/spec.md`.

    api.ts throws ─→ page catch ─→ toErrorMessage(e, fallback) ─→ string | null
                          │                                          │
                          │                                    null (401) ─→ render nothing, api.ts already redirects
                          └─ isNotFound(e) ─→ planes/[id] only ─→ router.push(list)

## Architecture Decisions

| ID | Option chosen | Rejected | Rationale |
|---|---|---|---|
| **A1 Timeout discriminator** | `status === undefined && message === API_TIMEOUT_MESSAGE` literal, constant re-declared in `api-error.ts` | (a) `e.name === "AbortError"` — impossible, verified §0.1; (b) export the constant *from* `api.ts` and import it | (b) is drift-proof but modifies `api.ts`, which the proposal scopes out. Chosen option keeps `api.ts` byte-identical; drift is caught by contract test **C1**, which drives the real `api.ts` through an abort and asserts the helper recognizes it. Worst case on undetected drift is a *degraded* message (fallback), never a wrong one. |
| **A2 Empty-message guard** | 4xx branch requires `message.trim() !== ""` | trust `e.message` for all 4xx | §0.2 — otherwise an HTTP/2 non-JSON 4xx renders an empty red box. |
| **A3 401 propagation** | `toErrorMessage` returns `null`; every call site does `const msg = ...; if (msg) setError(msg)` | `?? ""` at each call site | `if (msg)` never touches state on 401, so no error flashes and no state churn during the `/login` navigation. Uniform across all 5 pages. |
| **A4 `planes/[id]` gets a retry** | extract `loadPlan` into `useCallback`, render `<ErrorState message={loadError} onRetry={loadPlan} />` | bare `<ErrorState>` with no retry | D4 stops the redirect; without a retry the user is left on a dead-end card with no way forward. Same 4-line pattern as D3's `planes/page.tsx`. |
| **A5 `gym/activo` detail channel** | call `toErrorMessage(e, "")` — `""` means "no API detail worth showing", `null` means 401 | a second helper, or comparing against the fallback string | Reuses one function; the fixed D2 sentence is hardcoded in JSX and structurally cannot be replaced by API text. |
| **A6 — folded into scope (orchestrator, 2026-09-04)** | `planes/page.tsx`'s existing `deletePlan` catch is migrated to `toErrorMessage(e, "Error al eliminar el plan")`, writing into the already-existing `deleteError` state (no new state needed — it already exists and already renders) | leave it as `err.message` for any status | Same file, same PR, same helper we are already building — the exact bug this change fixes at 6 sites (English `statusText` leaking) would otherwise remain right next to the fix, in the same file, for no reason a future reader could infer. Zero new risk surface: `deleteError` already exists and already renders; only its assignment changes from raw `err.message` to `toErrorMessage(...)`. |

## File Changes

| File (under `projects/web/web3-next/`) | Action | Description |
|---|---|---|
| `lib/api-error.ts` | Create | `toErrorMessage`, `isNotFound`, `API_TIMEOUT_MESSAGE` |
| `app/app/entrenamiento/planes/page.tsx` | Modify | `loadPlans` callback + `loadError` + `<ErrorState>` |
| `app/app/entrenamiento/planes/nuevo/page.tsx` | Modify | `saveError` + inline `<p>` above the save button |
| `app/app/entrenamiento/planes/[id]/page.tsx` | Modify | 404-gated redirect, `loadError` + retry, `startError` |
| `app/app/entrenamiento/gym/activo/page.tsx` | Modify | `saveFailed`/`saveErrorDetail` + D2 block above the actions |
| `app/app/nutricion/favoritos/page.tsx` | Modify | `toggleError` only; migration block (lines 89-134) untouched |
| `__tests__/lib/api-error.test.ts` | Create | T1 + contract test C1 |
| `__tests__/app/entrenamiento/planes-detail.test.tsx` | Create | T2a |
| `__tests__/app/entrenamiento/gym-activo.test.tsx` | Create | T2b |
| `lib/api.ts` | **Unchanged** | — |

---

## 1. `lib/api-error.ts` (exact contents)

```ts
/**
 * Decisiones puras para mostrar fallos de API. Sin React, sin DOM.
 *
 * Contrato de errores de `lib/api.ts` (verificado 2026-09-04):
 *  - Fallo HTTP     -> Error con `.status` = código real y `.message` = body.message
 *                      | res.statusText | "Error de API"  (api.ts:117-120)
 *  - Timeout        -> Error PLANO, `.name === "Error"`, SIN `.status`,
 *                      `.message` = la constante de abajo            (api.ts:105-109)
 *  - Fallo de red   -> lo que rechace `fetch` (TypeError), sin `.status` (api.ts:110)
 */

/** Literal exacto que lanza `lib/api.ts` al abortar por timeout (api.ts:108). */
export const API_TIMEOUT_MESSAGE = "La petición tardó demasiado (timeout 10s)";

type ApiError = Error & { status?: number };

function asApiError(error: unknown): ApiError | null {
  return error instanceof Error ? (error as ApiError) : null;
}

/**
 * El timeout no es un AbortError: `api.ts` lo captura y relanza un Error plano,
 * así que el único discriminante disponible es "sin status + mensaje exacto".
 */
function isTimeout(error: ApiError): boolean {
  return error.status === undefined && error.message === API_TIMEOUT_MESSAGE;
}

/** Solo el 404 real de la API. Cualquier otro fallo NO es "no existe". */
export function isNotFound(error: unknown): boolean {
  return asApiError(error)?.status === 404;
}

/**
 * Mensaje a mostrar, o `null` si no hay que mostrar nada.
 *
 * - 401  -> `null`: `api.ts` ya redirige a /login; pintar un error solo produce
 *           un parpadeo rojo durante la navegación.
 * - timeout -> su propio mensaje (es más útil que el fallback).
 * - 4xx  -> el mensaje de la API (texto en español y accionable de Laravel),
 *           salvo que venga vacío (statusText es "" en HTTP/2).
 * - resto (5xx, red, valores no-Error) -> el fallback local en español; nunca
 *           se filtra `res.statusText` en inglés ("Internal Server Error").
 */
export function toErrorMessage(error: unknown, fallback: string): string | null {
  const e = asApiError(error);
  if (!e) return fallback;
  if (e.status === 401) return null;
  if (isTimeout(e)) return API_TIMEOUT_MESSAGE;

  const message = e.message.trim();
  const isClientError = e.status !== undefined && e.status >= 400 && e.status <= 499;
  return isClientError && message !== "" ? message : fallback;
}
```

---

## 2. Exact page diffs

### 2.1 `app/app/entrenamiento/planes/page.tsx` (site 1, D3)

```diff
-import { useEffect, useState } from "react";
+import { useCallback, useEffect, useState } from "react";
 import { api, type WorkoutPlan } from "@/lib/api";
+import { toErrorMessage } from "@/lib/api-error";
 import { useAuth } from "@/lib/auth";
 import { Card, PageHeader, Button } from "@/components/ui";
+import { ErrorState } from "@/components/ErrorState";
 import Link from "next/link";
@@
   const [loading, setLoading] = useState(true);
   const [deleteError, setDeleteError] = useState("");
+  const [loadError, setLoadError] = useState("");
 
-  useEffect(() => {
-    if (!token) return;
-    api.workoutPlans(token)
-      .then((r) => setPlans(r.plans))
-      .catch(console.error)
-      .finally(() => setLoading(false));
-  }, [token]);
+  const loadPlans = useCallback(() => {
+    if (!token) return;
+    setLoadError("");
+    setLoading(true);
+    api.workoutPlans(token)
+      .then((r) => setPlans(r.plans))
+      .catch((e) => {
+        const msg = toErrorMessage(e, "Error al cargar tus planes");
+        if (msg) setLoadError(msg);
+      })
+      .finally(() => setLoading(false));
+  }, [token]);
+
+  useEffect(() => {
+    loadPlans();
+  }, [loadPlans]);
@@
       {loading ? (
         <p className="text-center text-muted">Cargando...</p>
+      ) : loadError ? (
+        <ErrorState message={loadError} onRetry={loadPlans} />
       ) : plans.length === 0 ? (
```

`deletePlan`'s catch (folded into scope per A6) additionally changes from raw `err.message` to
`toErrorMessage(e, "Error al eliminar el plan")` — same `deleteError` state, same render site
(line 41), just the message source. On a 401 during load, `loadError` stays empty and the
pre-existing empty-state flash during the `/login` redirect is unchanged — no regression.

### 2.2 `app/app/entrenamiento/planes/nuevo/page.tsx` (site 2)

```diff
 import { api, type Exercise, type PlanExercise, type PlanSet } from "@/lib/api";
+import { toErrorMessage } from "@/lib/api-error";
@@
   const [saving, setSaving] = useState(false);
+  const [saveError, setSaveError] = useState("");
@@
   const save = async () => {
     if (!token || !name || exercises.length === 0) return;
     setSaving(true);
+    setSaveError("");
     try {
       await api.createWorkoutPlan(token, { name, description: description || undefined, exercises });
       router.push("/app/entrenamiento/planes");
     } catch (e) {
-      console.error(e);
+      const msg = toErrorMessage(e, "Error al guardar el plan");
+      if (msg) setSaveError(msg);
     } finally {
       setSaving(false);
     }
   };
@@
       {/* Save */}
+      {saveError && <p className="mb-2 text-sm text-danger">{saveError}</p>}
       <Button onClick={save} className="w-full" disabled={!name || exercises.length === 0 || saving}>
```

### 2.3 `app/app/entrenamiento/planes/[id]/page.tsx` (sites 4a + 4b, D4 + A4)

```diff
-import { useEffect, useState } from "react";
+import { useCallback, useEffect, useState } from "react";
 import { useParams, useRouter } from "next/navigation";
 import { api, type WorkoutPlan } from "@/lib/api";
+import { isNotFound, toErrorMessage } from "@/lib/api-error";
 import { useAuth } from "@/lib/auth";
 import { Card, PageHeader, Button } from "@/components/ui";
+import { ErrorState } from "@/components/ErrorState";
@@
   const [loading, setLoading] = useState(true);
   const [starting, setStarting] = useState(false);
+  const [loadError, setLoadError] = useState("");
+  const [startError, setStartError] = useState("");
 
-  useEffect(() => {
-    if (!token || !id) return;
-    api.workoutPlan(token, id)
-      .then((r) => setPlan(r.plan))
-      .catch(() => router.push("/app/entrenamiento/planes"))
-      .finally(() => setLoading(false));
-  }, [token, id, router]);
+  const loadPlan = useCallback(() => {
+    if (!token || !id) return;
+    setLoadError("");
+    setLoading(true);
+    api.workoutPlan(token, id)
+      .then((r) => setPlan(r.plan))
+      .catch((e) => {
+        // Solo un 404 real significa "este plan no existe": ahí sí se redirige.
+        if (isNotFound(e)) {
+          router.push("/app/entrenamiento/planes");
+          return;
+        }
+        const msg = toErrorMessage(e, "Error al cargar el plan");
+        if (msg) setLoadError(msg);
+      })
+      .finally(() => setLoading(false));
+  }, [token, id, router]);
+
+  useEffect(() => {
+    loadPlan();
+  }, [loadPlan]);
 
   const startWorkout = async () => {
     if (!token || !plan?.id) return;
     setStarting(true);
+    setStartError("");
     try {
       const { workout } = await api.workoutFromPlan(token, plan.id);
       sessionStorage.setItem("tracklife_active_workout", JSON.stringify(workout));
       sessionStorage.setItem("tracklife_workout_start", Date.now().toString());
       router.push("/app/entrenamiento/gym/activo");
     } catch (e) {
-      console.error(e);
+      const msg = toErrorMessage(e, "Error al iniciar el workout");
+      if (msg) setStartError(msg);
     } finally {
       setStarting(false);
     }
   };
 
   if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
+  if (loadError) return <ErrorState message={loadError} onRetry={loadPlan} />;
   if (!plan) return null;
@@
       <Button onClick={startWorkout} className="mt-4 w-full text-lg py-3" disabled={starting}>
         {starting ? "Preparando..." : "Iniciar Workout"}
       </Button>
+      {startError && <p className="mt-2 text-sm text-danger">{startError}</p>}
     </div>
```

Branch order matters: `loading` → `loadError` → `!plan`. Today a non-404 failure falls through to
`if (!plan) return null` and renders a **blank page**; the new branch is what removes that.

### 2.4 `app/app/entrenamiento/gym/activo/page.tsx` (site 3, D2 verbatim)

```diff
 import { api, type ActiveWorkoutSet } from "@/lib/api";
+import { toErrorMessage } from "@/lib/api-error";
@@
   const [saving, setSaving] = useState(false);
   const [loaded, setLoaded] = useState(false);
+  const [saveFailed, setSaveFailed] = useState(false);
+  const [saveErrorDetail, setSaveErrorDetail] = useState("");
@@
   const finishWorkout = async () => {
     if (!token) return;
     setSaving(true);
+    setSaveFailed(false);
+    setSaveErrorDetail("");
@@
       sessionStorage.removeItem("tracklife_active_workout");
       sessionStorage.removeItem("tracklife_workout_start");
       router.push("/app/entrenamiento/progreso");
     } catch (e) {
-      console.error(e);
+      // "" => no hay detalle de API que merezca mostrarse; null => 401, api.ts ya redirige.
+      const detail = toErrorMessage(e, "");
+      if (detail !== null) {
+        setSaveFailed(true);
+        setSaveErrorDetail(detail);
+      }
     } finally {
       setSaving(false);
     }
   };
@@
       <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 md:ml-56">
-        <div className="mx-auto flex max-w-5xl gap-3">
-          <Button onClick={cancelWorkout} variant="ghost" className="flex-1">
-            Cancelar
-          </Button>
-          <Button onClick={finishWorkout} className="flex-1" disabled={completedSets === 0 || saving}>
-            {saving ? "Guardando..." : `Finalizar (${completedSets} series)`}
-          </Button>
+        <div className="mx-auto max-w-5xl">
+          {saveFailed && (
+            <div className="mb-3" role="alert">
+              <p className="text-sm text-danger">
+                No se pudo guardar el entrenamiento. Tus series siguen aquí — no cierres esta pestaña y vuelve a intentarlo.
+              </p>
+              {saveErrorDetail && <p className="mt-1 text-xs text-muted">{saveErrorDetail}</p>}
+            </div>
+          )}
+          <div className="flex gap-3">
+            <Button onClick={cancelWorkout} variant="ghost" className="flex-1">
+              Cancelar
+            </Button>
+            <Button onClick={finishWorkout} className="flex-1" disabled={completedSets === 0 || saving}>
+              {saving ? "Guardando..." : `Finalizar (${completedSets} series)`}
+            </Button>
+          </div>
         </div>
       </div>
```

The two `sessionStorage.removeItem` calls stay inside `try`, after the `await` — the D2 promise ("tus
series siguen aquí") is therefore true by construction, and T2b asserts it.

### 2.5 `app/app/nutricion/favoritos/page.tsx` (site 5)

```diff
 import { api, type MealEntry, type Recipe, type FoodItem } from "@/lib/api";
+import { toErrorMessage } from "@/lib/api-error";
@@
   const [addState, setAddState] = useState<AddToDiaryState>("idle");
+  const [toggleError, setToggleError] = useState("");
@@
   const toggle = useCallback((entry: FavoriteEntry) => {
     if (!token) return;
     const key = favoriteKey(entry);
     const wasFav = favorites.has(key);
     const ref = entryRef(entry);
+    setToggleError("");
@@
     request.catch((err) => {
       // revierte la mutacion optimista si la API falla
       console.error(`Fallo al ${wasFav ? "quitar" : "anadir"} favorito "${key}"`, err);
+      const msg = toErrorMessage(err, "Error al actualizar el favorito");
+      if (msg) setToggleError(msg);
       setFavorites((prev) => {
@@
       {loading && <SkeletonList />}
       {error && <ErrorState message={error} onRetry={refetch} />}
+      {toggleError && <p className="mb-3 text-sm text-danger">{toggleError}</p>}
```

The migration `useEffect` (lines 89-134, including the three catch sites at 111-124) is **not touched** —
required byte-identical by the spec. `toggle`'s existing `console.error` is kept on purpose: it is no
longer the *only* feedback, so it violates no success criterion, and it keeps parity with the migration
block's debugging output. `setToggleError` is a stable setter, so the `useCallback` deps stay `[favorites, token]`.

---

## 3. Test files (D7 tiering)

Conventions taken from `__tests__/lib/auth.test.tsx`: explicit `vitest` imports (`globals: false`), no
`@testing-library/jest-dom` (assert `.textContent`/truthiness, never `toBeInTheDocument`), mock factories
that reference outer `vi.fn()`s **lazily inside arrows** (the factory body runs at import time, the arrows
at call time). `vitest.setup.ts` already registers RTL `cleanup`.

### 3.1 T1 — `__tests__/lib/api-error.test.ts`

```ts
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
```

### 3.2 T2a — `__tests__/app/entrenamiento/planes-detail.test.tsx`

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanDetailPage from "@/app/app/entrenamiento/planes/[id]/page";

const push = vi.fn();
const back = vi.fn();
const workoutPlanMock = vi.fn();
const workoutFromPlanMock = vi.fn();

// Las factorías se evalúan al importar; las flechas internas se evalúan al llamar,
// que es cuando los `vi.fn()` de arriba ya están inicializados (patrón de auth.test.tsx).
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plan-1" }),
  useRouter: () => ({ push, back }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, token: "cookie", loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    workoutPlan: (...args: unknown[]) => workoutPlanMock(...args),
    workoutFromPlan: (...args: unknown[]) => workoutFromPlanMock(...args),
  },
}));

function httpError(status: number, message: string): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  push.mockReset();
  back.mockReset();
  workoutPlanMock.mockReset();
  workoutFromPlanMock.mockReset();
});

describe("planes/[id] — carga inicial: 404 vs resto (D4)", () => {
  it("P1: un 404 sigue redirigiendo a la lista de planes y no pinta error", async () => {
    workoutPlanMock.mockRejectedValue(httpError(404, "No query results for model"));

    render(<PlanDetailPage />);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/entrenamiento/planes"));
    expect(screen.queryByText("Error al cargar el plan")).toBeNull();
  });

  it("P2: un 500 pinta el error inline y NO redirige", async () => {
    workoutPlanMock.mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<PlanDetailPage />);

    await waitFor(() => expect(screen.getByText("Error al cargar el plan")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    // El statusText en inglés nunca llega a la UI (D6).
    expect(screen.queryByText("Internal Server Error")).toBeNull();
  });

  it("P3: un fallo de red tampoco redirige", async () => {
    workoutPlanMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<PlanDetailPage />);

    await waitFor(() => expect(screen.getByText("Error al cargar el plan")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });

  it("P4: un 401 no pinta error inline (api.ts ya redirige a /login)", async () => {
    workoutPlanMock.mockRejectedValue(httpError(401, "Unauthenticated."));

    render(<PlanDetailPage />);

    await waitFor(() => expect(workoutPlanMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Cargando...")).toBeNull());
    expect(screen.queryByText("Error al cargar el plan")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
```

`ErrorState` renders `Button` **without** `href`, so no `next/link` is mounted — no app-router context is
required. `PlanDetailPage` reads `useParams`, which is mocked.

### 3.3 T2b — `__tests__/app/entrenamiento/gym-activo.test.tsx`

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActiveWorkoutPage from "@/app/app/entrenamiento/gym/activo/page";

const push = vi.fn();
const createWorkoutMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, token: "cookie", loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    createWorkout: (...args: unknown[]) => createWorkoutMock(...args),
  },
}));

const REASSURANCE =
  "No se pudo guardar el entrenamiento. Tus series siguen aquí — no cierres esta pestaña y vuelve a intentarlo.";

const STORED_WORKOUT = {
  name: "Push Day",
  plan_id: "plan-1",
  sets: [
    {
      exercise: "Press banca",
      exercise_id: "ex-1",
      set_number: 1,
      type: "normal",
      weight: 60,
      reps: 10,
      rest_seconds: 90,
      completed: true,
    },
  ],
};

function httpError(status: number, message: string): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

function storedSets() {
  const raw = window.sessionStorage.getItem("tracklife_active_workout");
  return raw ? (JSON.parse(raw) as typeof STORED_WORKOUT).sets : null;
}

beforeEach(() => {
  push.mockReset();
  createWorkoutMock.mockReset();
  window.sessionStorage.clear();
  window.sessionStorage.setItem("tracklife_active_workout", JSON.stringify(STORED_WORKOUT));
  window.sessionStorage.setItem("tracklife_workout_start", String(Date.now()));
});

describe("gym/activo — guardado fallido (D2)", () => {
  it("G1: muestra la frase de tranquilidad y sessionStorage conserva las series", async () => {
    createWorkoutMock.mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<ActiveWorkoutPage />);
    fireEvent.click(await screen.findByText(/^Finalizar/));

    await waitFor(() => expect(screen.getByText(REASSURANCE)).toBeTruthy());

    // La promesa que hace la copia: los datos siguen ahí.
    expect(storedSets()).toHaveLength(1);
    expect(storedSets()![0].completed).toBe(true);
    expect(storedSets()![0].weight).toBe(60);
    expect(window.sessionStorage.getItem("tracklife_workout_start")).not.toBeNull();

    // No navega fuera de la pestaña donde viven los datos.
    expect(push).not.toHaveBeenCalled();
    // No filtra el statusText en inglés.
    expect(screen.queryByText("Internal Server Error")).toBeNull();
  });

  it("G2: el detalle 4xx de la API es secundario y nunca sustituye la frase fija", async () => {
    createWorkoutMock.mockRejectedValue(httpError(422, "La duración no puede ser negativa"));

    render(<ActiveWorkoutPage />);
    fireEvent.click(await screen.findByText(/^Finalizar/));

    await waitFor(() => expect(screen.getByText(REASSURANCE)).toBeTruthy());
    const detail = screen.getByText("La duración no puede ser negativa");
    expect(detail.className).toContain("text-muted");
    expect(storedSets()).toHaveLength(1);
  });

  it("G3: un 401 no pinta nada (api.ts ya redirige a /login)", async () => {
    createWorkoutMock.mockRejectedValue(httpError(401, "Unauthenticated."));

    render(<ActiveWorkoutPage />);
    fireEvent.click(await screen.findByText(/^Finalizar/));

    await waitFor(() => expect(createWorkoutMock).toHaveBeenCalled());
    expect(screen.queryByText(REASSURANCE)).toBeNull();
    expect(storedSets()).toHaveLength(1);
  });

  it("G4: un guardado correcto limpia sessionStorage y navega a progreso", async () => {
    createWorkoutMock.mockResolvedValue({ workout: { id: "w-1" } });

    render(<ActiveWorkoutPage />);
    fireEvent.click(await screen.findByText(/^Finalizar/));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/entrenamiento/progreso"));
    expect(window.sessionStorage.getItem("tracklife_active_workout")).toBeNull();
    expect(screen.queryByText(REASSURANCE)).toBeNull();
  });
});
```

Note for the implementer: the page's persist effect rewrites `tracklife_active_workout` with an added
`date` field, so the assertions check the `sets` payload, never byte equality of the stored JSON.

### 3.4 Tiers T3 / T4

| Tier | Site | Plan |
|---|---|---|
| T3 best-effort | `planes/page.tsx` | Reject `api.workoutPlans`, assert "Error al cargar tus planes" + "Reintentar". **Caveat**: this page renders `next/link` (`Button href` + `Link`), which can require an app-router context in Next 16 — if it throws, add `vi.mock("next/link", () => ({ default: ({ href, children }) => <a href={href}>{children}</a> }))`. Do not spend more than that on it. |
| T4 manual/E2E | `nuevo/page.tsx`, `favoritos/page.tsx` | Manual check per Q4; no automated test (avoid coverage theatre). |

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (T1) | `toErrorMessage` / `isNotFound` full branch coverage + api.ts contract guard | `__tests__/lib/api-error.test.ts`, RED first |
| Component (T2) | `planes/[id]` 404-vs-500 routing; `gym/activo` reassurance + sessionStorage intact | RTL + jsdom, `vi.mock` of `next/navigation`, `@/lib/auth`, `@/lib/api` |
| Component (T3) | `planes/page.tsx` ErrorState + retry | best-effort |
| Manual (T4) | `nuevo`, `favoritos` | manual pass before merge |

## Threat Matrix

N/A — no routing to shell/subprocess, no VCS/PR automation, no executable-file classification, no process
integration. Client-side navigation changes (`router.push`) are in-app React Router calls with a fixed
literal destination, not URL-derived routing.

## Migration / Rollout

No migration. UI-only; single `git revert` per the proposal's rollback plan. `lib/api.ts` is unchanged, so
no shared contract moves.

## Review Workload Forecast

~135 changed lines of source + ~330 lines of tests across 9 files — comfortably under the 400-line
authored budget for a single PR. No chained PRs required.

## Open Questions

- None blocking. `deletePlan`'s raw-`err.message` issue is folded into scope (A6, resolved), not a
  follow-up anymore. One follow-up remains, logged out of scope: idempotency/disable-after-first-attempt
  for `createWorkout` (proposal Risks).
