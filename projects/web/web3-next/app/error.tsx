"use client";

import { ErrorState } from "@/components/ErrorState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Ha ocurrido un error inesperado" onRetry={reset} />;
}
