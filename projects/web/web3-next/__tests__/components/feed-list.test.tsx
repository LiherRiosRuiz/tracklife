import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedList } from "@/components/FeedList";
import { api } from "@/lib/api";
import type { FeedPost } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "cookie", user: null, loading: false }),
}));

vi.mock("@/lib/api", () => ({
  api: { like: vi.fn(), comment: vi.fn() },
}));

const POST: FeedPost = {
  id: "p1",
  type: "workout_completed",
  payload: { message: "Ha terminado un entreno" },
  likes_count: 2,
  liked: false,
  comments: [{ user_name: "Ana", text: "¡Buen trabajo!", created_at: "2026-09-15T10:00:00Z" }],
};

function httpError(status: number, message: string) {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeedList — comentarios", () => {
  it("F1: renders comments the API already returns", () => {
    // post.comments was already on the type and already in every response —
    // FeedList simply never painted it.
    render(<FeedList posts={[POST]} />);

    expect(screen.getByText(/¡Buen trabajo!/)).toBeTruthy();
    expect(screen.getByText(/Ana/)).toBeTruthy();
  });

  it("F2: submitting a comment posts it and shows the server's updated post", async () => {
    vi.mocked(api.comment).mockResolvedValue({
      post: {
        ...POST,
        comments: [...POST.comments, { user_name: "Liher", text: "Gracias!", created_at: "2026-09-15T11:00:00Z" }],
      },
    } as never);

    render(<FeedList posts={[POST]} />);

    fireEvent.change(screen.getByPlaceholderText("Escribe un comentario..."), {
      target: { value: "Gracias!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar comentario/i }));

    await waitFor(() => expect(api.comment).toHaveBeenCalledWith("cookie", "p1", "Gracias!"));
    await waitFor(() => expect(screen.getByText(/Gracias!/)).toBeTruthy());
  });

  it("F3: a failed comment surfaces a Spanish error and keeps the text for retry", async () => {
    vi.mocked(api.comment).mockRejectedValue(httpError(500, "Internal Server Error"));

    render(<FeedList posts={[POST]} />);

    const input = screen.getByPlaceholderText("Escribe un comentario...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Se perderá?" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar comentario/i }));

    await waitFor(() => expect(screen.getByText("Error al publicar el comentario")).toBeTruthy());
    // Losing what the user typed on a failed send is its own small betrayal.
    expect(input.value).toBe("Se perderá?");
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });

  it("F4: an empty comment is not sent", () => {
    render(<FeedList posts={[POST]} />);

    fireEvent.click(screen.getByRole("button", { name: /enviar comentario/i }));

    expect(api.comment).not.toHaveBeenCalled();
  });
});
