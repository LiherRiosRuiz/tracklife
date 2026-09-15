import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoachPlanPage from "@/app/app/coach/plan/page";
import { api } from "@/lib/api";

const routerStub = { push: vi.fn(), back: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    token: "cookie",
    user: { id: "u1", name: "Liher", transformation_goal: null },
    loading: false,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: { coachDaily: vi.fn(), macroProgress: vi.fn(), workoutPlans: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.coachDaily).mockResolvedValue({ insights: [] } as never);
  vi.mocked(api.macroProgress).mockResolvedValue({
    targets: { calories: 2200, protein: 150, carbs: 220, fat: 70 },
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  } as never);
});

describe("coach/plan — plan semanal real", () => {
  it("C1: renders the user's own workout plans, not a hardcoded template", async () => {
    // The API's real key is `plans` (see WorkoutPlanController@index and how
    // planes/page.tsx reads it). Mocking `workoutPlans` here originally encoded
    // my own mistake instead of the contract, and passed while the page was broken.
    vi.mocked(api.workoutPlans).mockResolvedValue({
      plans: [
        { id: "p1", name: "Push Pull Legs", days_per_week: 5, exercises: [] },
      ],
    } as never);

    render(<CoachPlanPage />);

    await waitFor(() => expect(screen.getByText("Push Pull Legs")).toBeTruthy());
    // The page's own subtitle promises a plan "basado en tus datos". A canned
    // template under that claim is a lie, so this string must never come back.
    expect(screen.queryByText(/Tren superior — pecho, espalda, hombros/)).toBeNull();
    expect(screen.queryByText(/Cardio moderado 30 min/)).toBeNull();
  });

  it("C2: with no plans, offers a way to create one instead of inventing a plan", async () => {
    vi.mocked(api.workoutPlans).mockResolvedValue({ plans: [] } as never);

    render(<CoachPlanPage />);

    await waitFor(() => {
      const cta = screen.getByRole("link", { name: /crear.*plan/i });
      expect(cta.getAttribute("href")).toBe("/app/entrenamiento/planes/nuevo");
    });
    expect(screen.queryByText(/Tren superior/)).toBeNull();
  });
});
