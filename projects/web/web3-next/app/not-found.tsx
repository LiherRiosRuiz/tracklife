import { Brand, Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 70%)" }}
      />
      <Card elevated className="relative w-full max-w-md text-center">
        <Brand className="text-2xl" />
        <p className="mt-6 text-5xl font-extrabold tracking-tight">404</p>
        <p className="mt-2 text-sm text-fg-muted">
          Esta página no existe o se movió de lugar.
        </p>
        <Button href="/" className="mt-6 w-full">
          Volver al inicio
        </Button>
      </Card>
    </div>
  );
}
