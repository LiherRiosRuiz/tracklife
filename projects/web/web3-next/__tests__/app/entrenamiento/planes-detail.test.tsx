import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanDetailPage from "@/app/app/entrenamiento/planes/[id]/page";
import type { WorkoutPlan } from "@/lib/api";

const push = vi.fn();
const back = vi.fn();
const workoutPlanMock = vi.fn();
const workoutFromPlanMock = vi.fn();
// Stable identity: a fresh object per useRouter() call would fail Object.is
// comparisons in loadPlan's callback deps, causing an extra load per render.
const routerStub = { push, back };

// Las factorías se evalúan al importar; las flechas internas se evalúan al llamar,
// que es cuando los `vi.fn()` de arriba ya están inicializados (patrón de auth.test.tsx).
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plan-1" }),
  useRouter: () => routerStub,
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

const PLAN: WorkoutPlan = {
  id: "plan-1",
  name: "Push Day",
  exercises: [
    {
      exercise_id: "ex-1",
      exercise_name: "Press banca",
      order: 1,
      sets: [{ set_number: 1, type: "normal", reps: 10, weight: 60, rest_seconds: 90 }],
    },
  ],
};

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

  it("P5: al reintentar con éxito, el error deja de mostrarse y se ve el plan (spec: error state clears on success)", async () => {
    workoutPlanMock.mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<PlanDetailPage />);

    await waitFor(() => expect(screen.getByText("Error al cargar el plan")).toBeTruthy());
    // El mock de next/navigation devuelve un `router` con nueva identidad en cada render, así
    // que el número exacto de re-invocaciones de `loadPlan` no es determinista aquí — se deja
    // el mock en modo persistente (no `Once`) para que cualquier número de llamadas posteriores
    // a "Reintentar" reciba el plan resuelto.
    workoutPlanMock.mockResolvedValue({ plan: PLAN });
    fireEvent.click(screen.getByText("Reintentar"));

    await waitFor(() => expect(screen.getByText("Push Day")).toBeTruthy());
    expect(screen.queryByText("Error al cargar el plan")).toBeNull();
  });
});

describe("planes/[id] — startWorkout (A4/D6)", () => {
  it("P6: un fallo (no-401) al iniciar el workout pinta el error inline y no navega", async () => {
    workoutPlanMock.mockResolvedValue({ plan: PLAN });
    workoutFromPlanMock.mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<PlanDetailPage />);
    fireEvent.click(await screen.findByText("Iniciar Workout"));

    await waitFor(() => expect(screen.getByText("Error al iniciar el workout")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("Internal Server Error")).toBeNull();
  });

  it("P7: un 401 al iniciar el workout no pinta error inline (api.ts ya redirige a /login)", async () => {
    workoutPlanMock.mockResolvedValue({ plan: PLAN });
    workoutFromPlanMock.mockRejectedValue(httpError(401, "Unauthenticated."));

    render(<PlanDetailPage />);
    fireEvent.click(await screen.findByText("Iniciar Workout"));

    await waitFor(() => expect(workoutFromPlanMock).toHaveBeenCalled());
    expect(screen.queryByText("Error al iniciar el workout")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
