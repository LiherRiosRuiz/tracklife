import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusComposer } from "@/components/StatusComposer";
import { api } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));
vi.mock("@/lib/api", () => ({ api: { createStatusPost: vi.fn() } }));

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StatusComposer", () => {
  it("S1: posts trimmed text and hands the new post back", async () => {
    const post = { id: "p9", type: "status_update", payload: { message: "Hola" } };
    vi.mocked(api.createStatusPost).mockResolvedValue({ post } as never);
    const onPosted = vi.fn();

    render(<StatusComposer onPosted={onPosted} />);
    fireEvent.change(screen.getByPlaceholderText("¿Cómo va tu entrenamiento?"), {
      target: { value: "  Hola  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect(api.createStatusPost).toHaveBeenCalledWith("cookie", "Hola"));
    await waitFor(() => expect(onPosted).toHaveBeenCalledWith(post));
  });

  it("S2: a failed post keeps the text and shows a Spanish error", async () => {
    vi.mocked(api.createStatusPost).mockRejectedValue(httpError(500, "Internal Server Error"));
    const onPosted = vi.fn();

    render(<StatusComposer onPosted={onPosted} />);
    const box = screen.getByPlaceholderText("¿Cómo va tu entrenamiento?") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "No se pierde" } });
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect(screen.getByText("Error al publicar")).toBeTruthy());
    expect(box.value).toBe("No se pierde");
    expect(onPosted).not.toHaveBeenCalled();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });
});
