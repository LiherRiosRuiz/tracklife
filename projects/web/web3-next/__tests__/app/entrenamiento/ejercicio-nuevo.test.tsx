import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NuevoEjercicioPage from "@/app/app/entrenamiento/gym/ejercicios/nuevo/page";
import { api } from "@/lib/api";

const push = vi.fn();
const routerStub = { push };

vi.mock("next/navigation", () => ({ useRouter: () => routerStub }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));
vi.mock("@/lib/api", () => ({ api: { createExercise: vi.fn() } }));

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("nuevo ejercicio", () => {
  it("E1: sends only the fields StoreExerciseRequest accepts", async () => {
    vi.mocked(api.createExercise).mockResolvedValue({ exercise: { name: "Remo" } } as never);

    render(<NuevoEjercicioPage />);
    fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Remo con barra" } });
    fireEvent.change(screen.getByPlaceholderText("Instrucciones (una por línea)"), {
      target: { value: "Espalda recta\nTirar al abdomen" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar ejercicio/i }));

    await waitFor(() => expect(api.createExercise).toHaveBeenCalled());
    const [, payload] = vi.mocked(api.createExercise).mock.calls[0];
    expect(payload.name).toBe("Remo con barra");
    expect(payload.instructions).toEqual(["Espalda recta", "Tirar al abdomen"]);
    // is_custom / user_id are server-set; image_url isn't accepted at all.
    expect("is_custom" in payload).toBe(false);
    expect("image_url" in payload).toBe(false);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/entrenamiento/gym/ejercicios"));
  });

  it("E2: a failed save shows a Spanish error and stays on the form", async () => {
    vi.mocked(api.createExercise).mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<NuevoEjercicioPage />);
    fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Remo" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar ejercicio/i }));

    await waitFor(() => expect(screen.getByText("Error al guardar el ejercicio")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
