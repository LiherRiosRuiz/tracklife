import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/app/registro/RegisterForm";

const push = vi.fn();
const routerStub = { push };
const registerMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => routerStub }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ register: registerMock, user: null, token: null, loading: false }),
}));

function fillBasics() {
  fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Liher" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "l@t.test" } });
  fireEvent.change(screen.getByPlaceholderText("Contraseña (mín. 8)"), { target: { value: "password123" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registro — consentimiento", () => {
  it("C1: unchecked boxes show both errors and never call register", async () => {
    // The real bug this guards: fieldErrors is built from an explicit key list,
    // so a zod error on an unlisted key is swallowed and the button looks dead.
    render(<RegisterForm />);
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(screen.getByText("Debes aceptar los términos y la política de privacidad.")).toBeTruthy(),
    );
    expect(
      screen.getByText("Debes dar tu consentimiento explícito para tratar tus datos de salud."),
    ).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("C2: accepting the terms alone is not enough — health data needs its own consent", async () => {
    render(<RegisterForm />);
    fillBasics();
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Debes dar tu consentimiento explícito para tratar tus datos de salud."),
      ).toBeTruthy(),
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("C3: with both checked, register receives the consent flags", async () => {
    registerMock.mockResolvedValue(undefined);
    render(<RegisterForm />);
    fillBasics();
    screen.getAllByRole("checkbox").forEach((box) => fireEvent.click(box));
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        name: "Liher",
        email: "l@t.test",
        password: "password123",
        acceptTerms: true,
        acceptHealthData: true,
      }),
    );
  });
});
