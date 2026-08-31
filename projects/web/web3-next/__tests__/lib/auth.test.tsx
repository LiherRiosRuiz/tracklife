import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { User } from "@/lib/api";

const meMock = vi.fn();

// `lib/auth.tsx` imports `api`/`SESSION_SENTINEL` via a relative "./api" specifier, which
// resolves to the same module graph node as "@/lib/api" (tsconfig-paths alias), so mocking
// either specifier substitutes the same dependency — verified working in Batch 3's
// `__tests__/lib/api.test.ts` alias resolution and re-confirmed by the RED run below.
vi.mock("@/lib/api", () => ({
  api: { me: (...args: unknown[]) => meMock(...args) },
  SESSION_SENTINEL: "cookie",
}));

const AUTH_TOKEN_KEY = "tracklife_token";

// No `@testing-library/jest-dom` in this project (design §1: "keeps the prerequisite
// surface minimal") — so `toHaveTextContent` is unavailable. Assert `.textContent` directly.
function expectText(el: HTMLElement, text: string) {
  expect(el.textContent).toBe(text);
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "1",
    name: "Ada Lovelace",
    username: "ada",
    email: "ada@example.com",
    streak_days: 0,
    macro_targets: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    ...overrides,
  };
}

/** Renders the context so tests can read state and trigger login/logout via the DOM. */
function Probe() {
  const { user, token, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="token">{token ?? "null"}</span>
      <span data-testid="user">{user ? user.name : "null"}</span>
      <button onClick={() => void login("ada@example.com", "hunter2")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  meMock.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lib/auth.tsx — cookie-only bootstrap (design §4)", () => {
  it("B1: a valid session on mount sets user + sentinel token, resolves loading", async () => {
    meMock.mockResolvedValue({ user: makeUser({ name: "Ada Lovelace" }) });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expectText(screen.getByTestId("loading"), "false"));
    expectText(screen.getByTestId("user"), "Ada Lovelace");
    expectText(screen.getByTestId("token"), "cookie");
    expect(meMock).toHaveBeenCalledExactlyOnceWith("cookie");
  });

  it("B2: a 401 on mount clears user/token, resolves loading, does not throw", async () => {
    const unauthorized = new Error("Unauthenticated.") as Error & { status?: number };
    unauthorized.status = 401;
    meMock.mockRejectedValue(unauthorized);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expectText(screen.getByTestId("loading"), "false"));
    expectText(screen.getByTestId("user"), "null");
    expectText(screen.getByTestId("token"), "null");
  });

  it("B3: a network error on mount resolves loading the same as B2 — no infinite spinner", async () => {
    meMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expectText(screen.getByTestId("loading"), "false"));
    expectText(screen.getByTestId("user"), "null");
    expectText(screen.getByTestId("token"), "null");
  });

  it("B4: login() populates context and never writes the auth token to localStorage", async () => {
    meMock.mockRejectedValue({ status: 401 });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: makeUser({ id: "2", name: "Grace Hopper" }), token: "real-jwt-must-be-ignored" }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expectText(screen.getByTestId("loading"), "false"));

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => expectText(screen.getByTestId("user"), "Grace Hopper"));
    expectText(screen.getByTestId("token"), "cookie");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("B5: logout() POSTs /api/auth/logout, clears context, and clears the other user-scoped storage keys", async () => {
    meMock.mockResolvedValue({ user: makeUser({ name: "Ada Lovelace" }) });
    window.localStorage.setItem("tracklife_favorites", "[1,2]");
    window.sessionStorage.setItem("tracklife_active_workout", "{}");
    window.sessionStorage.setItem("tracklife_workout_start", "123");
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expectText(screen.getByTestId("user"), "Ada Lovelace"));

    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => expectText(screen.getByTestId("user"), "null"));
    expectText(screen.getByTestId("token"), "null");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(window.localStorage.getItem("tracklife_favorites")).toBeNull();
    expect(window.sessionStorage.getItem("tracklife_active_workout")).toBeNull();
    expect(window.sessionStorage.getItem("tracklife_workout_start")).toBeNull();
  });

  it("B6: invariant — Storage.prototype.setItem is never called with the auth token key across login -> reload -> logout", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    // 1. Initial mount: no session yet (visitor).
    meMock.mockRejectedValueOnce({ status: 401 });
    const first = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expectText(first.getByTestId("loading"), "false"));

    // 2. login().
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: makeUser({ id: "3", name: "Rosalind Franklin" }), token: "real-jwt-must-be-ignored" }),
    );
    fireEvent.click(first.getByText("login"));
    await waitFor(() => expectText(first.getByTestId("user"), "Rosalind Franklin"));

    // 3. "Reload": unmount (drops all in-memory state) and remount a fresh AuthProvider —
    // the only thing that can carry the session across this boundary is the httpOnly
    // cookie, which the mount effect can only observe indirectly via api.me() resolving.
    first.unmount();
    meMock.mockResolvedValueOnce({ user: makeUser({ id: "3", name: "Rosalind Franklin" }) });
    const second = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expectText(second.getByTestId("user"), "Rosalind Franklin"));

    // 4. logout().
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "ok" }));
    fireEvent.click(second.getByText("logout"));
    await waitFor(() => expectText(second.getByTestId("user"), "null"));

    const tokenWrites = setItemSpy.mock.calls.filter(([key]) => key === AUTH_TOKEN_KEY);
    expect(tokenWrites).toHaveLength(0);

    setItemSpy.mockRestore();
  });
});
