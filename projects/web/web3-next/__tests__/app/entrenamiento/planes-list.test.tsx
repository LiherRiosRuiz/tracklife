import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanesPage from "@/app/app/entrenamiento/planes/page";

const workoutPlansMock = vi.fn();
const deleteWorkoutPlanMock = vi.fn();

// Las factorías se evalúan al importar; las flechas internas se evalúan al llamar
// (patrón de auth.test.tsx / T2a).
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, token: "cookie", loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    workoutPlans: (...args: unknown[]) => workoutPlansMock(...args),
    deleteWorkoutPlan: (...args: unknown[]) => deleteWorkoutPlanMock(...args),
  },
}));

// Caveat documentado en design §3.4: `planes/page.tsx` renderiza un `Button href=...`
// (envuelve `next/link`) fuera de la rama loading/error, así que un `next/link` real
// se monta incluso durante el estado de error — sin contexto de app-router en Next 16
// esto puede lanzar. Se mockea al mínimo alcance documentado, nada más.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function httpError(status: number, message: string): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  workoutPlansMock.mockReset();
  deleteWorkoutPlanMock.mockReset();
});

describe("planes/page.tsx — fallo de carga muestra error visible (T3, best-effort)", () => {
  it("un fallo no-401 al cargar los planes muestra el error y el control Reintentar", async () => {
    workoutPlansMock.mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<PlanesPage />);

    await waitFor(() => expect(screen.getByText("Error al cargar tus planes")).toBeTruthy());
    expect(screen.getByText("Reintentar")).toBeTruthy();
    // El statusText en inglés nunca llega a la UI (D6).
    expect(screen.queryByText("Internal Server Error")).toBeNull();
  });
});
