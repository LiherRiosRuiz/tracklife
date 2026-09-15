import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogBiometricForm } from "@/components/LogBiometricForm";
import { api } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { createBiometric: vi.fn() },
}));

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

function renderForm(onSaved = vi.fn()) {
  render(
    <LogBiometricForm type="sleep_score" label="Calidad del sueño" unit="%" min={0} max={100} onSaved={onSaved} />,
  );
  return onSaved;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LogBiometricForm", () => {
  it("B1: posts the exact {type, value, unit} the API expects", async () => {
    vi.mocked(api.createBiometric).mockResolvedValue({} as never);
    const onSaved = renderForm();

    fireEvent.change(screen.getByLabelText("Calidad del sueño"), { target: { value: "82" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() =>
      expect(api.createBiometric).toHaveBeenCalledWith("cookie", {
        type: "sleep_score",
        value: 82,
        unit: "%",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("B2: rejects a value outside the allowed range without calling the API", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Calidad del sueño"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar/i }));

    expect(screen.getByText("El valor debe estar entre 0 y 100")).toBeTruthy();
    expect(api.createBiometric).not.toHaveBeenCalled();
  });

  it("B3: a failed save shows a Spanish error and does not report success", async () => {
    vi.mocked(api.createBiometric).mockRejectedValue(httpError(500, "Internal Server Error"));
    const onSaved = renderForm();

    fireEvent.change(screen.getByLabelText("Calidad del sueño"), { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => expect(screen.getByText("Error al guardar la medición")).toBeTruthy());
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
