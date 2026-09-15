import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiarioPage from "@/app/app/nutricion/diario/page";
import { api } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { meals: vi.fn(), deleteMeal: vi.fn(), updateMeal: vi.fn() },
}));

const MEALS = {
  meals: [
    {
      id: "m1",
      meal_type: "lunch",
      items: [{ name: "Arroz con pollo", calories: 520, protein: 40, carbs: 60, fat: 10 }],
      totals: { calories: 520, protein: 40, carbs: 60, fat: 10 },
      date: "2026-09-15",
    },
  ],
};

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.meals).mockResolvedValue(MEALS as never);
  // jsdom has no native confirm; the delete flow asks before destroying data.
  vi.stubGlobal("confirm", () => true);
});

describe("diario — borrar una comida", () => {
  it("D1: deleting a meal calls the API and removes the row on success", async () => {
    vi.mocked(api.deleteMeal).mockResolvedValue({ message: "Comida eliminada" } as never);

    render(<DiarioPage />);
    await waitFor(() => expect(screen.getByText(/Arroz con pollo/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    await waitFor(() => expect(api.deleteMeal).toHaveBeenCalledWith("cookie", "m1"));
    await waitFor(() => expect(screen.queryByText(/Arroz con pollo/)).toBeNull());
  });

  it("D2: a failed delete keeps the row and surfaces the error — no optimistic removal", async () => {
    vi.mocked(api.deleteMeal).mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<DiarioPage />);
    await waitFor(() => expect(screen.getByText(/Arroz con pollo/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    await waitFor(() => expect(screen.getByText("Error al eliminar la comida")).toBeTruthy());
    // The meal is still on the server, so it must still be on screen. Removing it
    // optimistically would tell the user their data is gone when it is not.
    expect(screen.getByText(/Arroz con pollo/)).toBeTruthy();
    // Raw English statusText must never reach the Spanish UI.
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
