"use client";

import { ErrorState } from "@/components/ErrorState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="No se pudo cargar el dashboard" onRetry={reset} />;
}
