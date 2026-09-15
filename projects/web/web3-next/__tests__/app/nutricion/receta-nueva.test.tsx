import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NuevaRecetaPage from "@/app/app/nutricion/recetas/nueva/page";
import { api } from "@/lib/api";

const push = vi.fn();
const routerStub = { push };

vi.mock("next/navigation", () => ({ useRouter: () => routerStub }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));
vi.mock("@/lib/api", () => ({ api: { createRecipe: vi.fn() } }));

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

function fill() {
  fireEvent.change(screen.getByPlaceholderText("Título"), { target: { value: "Tortilla" } });
  fireEvent.change(screen.getByPlaceholderText("Ingredientes (uno por línea)"), {
    target: { value: "2 huevos\n1 patata\n  \n" },
  });
  fireEvent.change(screen.getByPlaceholderText("Pasos (uno por línea)"), {
    target: { value: "Batir\nFreír" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("nueva receta", () => {
  it("R1: sends the shape StoreRecipeRequest expects, with blank lines dropped", async () => {
    vi.mocked(api.createRecipe).mockResolvedValue({ recipe: { title: "Tortilla" } } as never);

    render(<NuevaRecetaPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /guardar receta/i }));

    await waitFor(() => expect(api.createRecipe).toHaveBeenCalled());
    const [, payload] = vi.mocked(api.createRecipe).mock.calls[0];
    expect(payload.title).toBe("Tortilla");
    expect(payload.ingredients).toEqual(["2 huevos", "1 patata"]);
    expect(payload.steps).toEqual(["Batir", "Freír"]);
    // Monetization fields exist server-side but must never be sent pre-launch.
    expect("is_premium" in payload).toBe(false);
    expect("price" in payload).toBe(false);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/nutricion/recetas"));
  });

  it("R2: refuses to submit without ingredients, mirroring the server rule", () => {
    render(<NuevaRecetaPage />);
    fireEvent.change(screen.getByPlaceholderText("Título"), { target: { value: "Vacía" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar receta/i }));

    expect(screen.getByText("Añade al menos un ingrediente")).toBeTruthy();
    expect(api.createRecipe).not.toHaveBeenCalled();
  });

  it("R3: a failed save shows a Spanish error and does not navigate away", async () => {
    vi.mocked(api.createRecipe).mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<NuevaRecetaPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /guardar receta/i }));

    await waitFor(() => expect(screen.getByText("Error al guardar la receta")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
