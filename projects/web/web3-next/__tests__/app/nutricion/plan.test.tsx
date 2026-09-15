import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanPage from "@/app/app/nutricion/plan/page";
import { api } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { getMacroTargets: vi.fn(), updateMacroTargets: vi.fn() },
}));

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("plan nutricional — fallo de carga", () => {
  it("P1: a failed load shows a retry affordance and NO save form", async () => {
    vi.mocked(api.getMacroTargets).mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<PlanPage />);

    await waitFor(() => expect(screen.getByText("Reintentar")).toBeTruthy());
    // The old behaviour prefilled the form with invented DEFAULTS on failure,
    // inviting the user to overwrite real targets the app had just failed to read.
    expect(screen.queryByRole("button", { name: /guardar/i })).toBeNull();
    // And the raw English statusText must never reach a Spanish UI.
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });

  it("P2: a successful load renders the user's real targets", async () => {
    vi.mocked(api.getMacroTargets).mockResolvedValue({
      targets: { calories: 2750, protein: 180, carbs: 300, fat: 80 },
    } as never);

    render(<PlanPage />);

    await waitFor(() => expect(screen.getAllByDisplayValue("2750").length).toBeGreaterThan(0));
  });
});
