import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActiveWorkoutPage from "@/app/app/entrenamiento/gym/activo/page";

const push = vi.fn();
const createWorkoutMock = vi.fn();

// The real `useRouter()` from `next/navigation` returns a referentially STABLE
// object across renders. The page's "Load workout" effect depends on `[router]`
// (app/app/entrenamiento/gym/activo/page.tsx:54), so a mock that returns a FRESH
// `{ push }` literal on every call breaks that stability invariant: the effect's
// dependency changes on every render, re-running `load()`, which calls
// `setSets(JSON.parse(...))` with a fresh array reference every time, causing an
// infinite render loop (verified empirically — the naive `() => ({ push })` mock
// hangs the test at 100% CPU with growing memory, never completing). Returning
// the SAME object reference from every `useRouter()` call restores the real
// hook's stability contract.
const routerStub = { push };
vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
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
