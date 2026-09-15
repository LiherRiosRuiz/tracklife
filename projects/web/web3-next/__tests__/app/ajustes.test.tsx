import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AjustesPage from "@/app/app/ajustes/page";
import type { User } from "@/lib/api";

const push = vi.fn();
const logout = vi.fn();
// Stable identity: a fresh object per useRouter() call breaks Object.is checks in
// any effect/callback dependency array and can drive an unbounded re-render loop.
const routerStub = { push };

vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
}));

const USER = {
  id: "u1",
  name: "Liher",
  username: "liher",
  email: "liher@tracklife.test",
  streak_days: 3,
  macro_targets: { calories: 2200, protein: 150, carbs: 220, fat: 70 },
} as unknown as User;

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: USER, token: "cookie", logout, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { updateProfile: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ajustes — cierre de sesión", () => {
  it("S1: logging out navigates to /login, the route that actually exists", () => {
    render(<AjustesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(logout).toHaveBeenCalled();
    // /auth/login is not a route in this app — pushing there lands the user on a 404.
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("S2: the account card offers a way to reach the goal page", () => {
    render(<AjustesPage />);

    const goalLink = screen.getByRole("link", { name: /objetivo/i });
    expect(goalLink.getAttribute("href")).toBe("/app/objetivo");
  });
});
