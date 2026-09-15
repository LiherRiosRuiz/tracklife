import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarForm } from "@/app/app/nutricion/registrar/RegistrarForm";

const push = vi.fn();
const routerStub = { push };
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
  useSearchParams: () => currentParams,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { searchFoods: vi.fn(), createMeal: vi.fn() },
}));

function inputByPlaceholder(placeholder: string): HTMLInputElement {
  return screen.getByPlaceholderText(placeholder) as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentParams = new URLSearchParams();
});

describe("registrar — handoff desde el escáner", () => {
  it("R1: prefills name and macros from the scanner's query string", () => {
    currentParams = new URLSearchParams({
      name: "Yogur griego",
      calories: "97",
      protein: "9",
      carbs: "4",
      fat: "5",
    });

    render(<RegistrarForm />);

    expect(inputByPlaceholder("Nombre").value).toBe("Yogur griego");
    expect(inputByPlaceholder("Kcal").value).toBe("97");
    expect(inputByPlaceholder("Proteína").value).toBe("9");
    expect(inputByPlaceholder("Carbos").value).toBe("4");
    expect(inputByPlaceholder("Grasas").value).toBe("5");
  });

  it("R2: renders an empty form when opened directly, with no query string", () => {
    render(<RegistrarForm />);

    expect(inputByPlaceholder("Nombre").value).toBe("");
    expect(inputByPlaceholder("Kcal").value).toBe("");
  });
});
