import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ObjetivoPage from "@/app/app/objetivo/page";
import { api } from "@/lib/api";
import type { User } from "@/lib/api";

const refreshUser = vi.fn();
let currentUser: User | null = null;
let currentLoading = false;

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: currentUser, token: "cookie", loading: currentLoading, refreshUser }),
}));

vi.mock("@/lib/api", () => ({
  api: { updateProfile: vi.fn() },
}));

function userWithGoal(goal: Record<string, unknown> | undefined): User {
  return {
    id: "u1",
    name: "Liher",
    username: "liher",
    email: "l@t.test",
    streak_days: 0,
    macro_targets: { calories: 2200, protein: 150, carbs: 220, fat: 70 },
    transformation_goal: goal,
  } as unknown as User;
}

function inputByPlaceholder(p: string): HTMLInputElement {
  return screen.getByPlaceholderText(p) as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentLoading = false;
  currentUser = null;
});

describe("objetivo — precarga del objetivo existente", () => {
  it("O1: prefills the form from the user's saved transformation_goal", () => {
    currentUser = userWithGoal({ target_weight: 78, target_body_fat: 14, deadline: "2026-12-01" });

    render(<ObjetivoPage />);

    // Without this the saved goal renders as an empty form and the user
    // silently overwrites it with blanks.
    expect(inputByPlaceholder("Peso objetivo (kg)").value).toBe("78");
    expect(inputByPlaceholder("% grasa objetivo (opcional)").value).toBe("14");
  });

  it("O2: renders empty fields when the user has no goal yet", () => {
    currentUser = userWithGoal(undefined);

    render(<ObjetivoPage />);

    expect(inputByPlaceholder("Peso objetivo (kg)").value).toBe("");
    expect(inputByPlaceholder("% grasa objetivo (opcional)").value).toBe("");
  });

  it("O3: refreshes the auth context after saving, so the new goal is not stale elsewhere", async () => {
    currentUser = userWithGoal(undefined);
    vi.mocked(api.updateProfile).mockResolvedValue({ user: userWithGoal({ target_weight: 80 }) } as never);

    render(<ObjetivoPage />);
    fireEvent.change(inputByPlaceholder("Peso objetivo (kg)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar objetivo/i }));

    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });
});
