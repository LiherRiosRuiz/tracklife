import { Suspense } from "react";
import { SkeletonCard } from "@/components/Skeleton";
import { RegistrarForm } from "./RegistrarForm";

// RegistrarForm reads the scanner handoff via useSearchParams, which in a
// prerendered route client-side-renders everything up to the nearest Suspense
// boundary. Keeping that boundary here lets the rest of the route prerender.
export default function RegistrarComidaPage() {
  return (
    <Suspense fallback={<SkeletonCard />}>
      <RegistrarForm />
    </Suspense>
  );
}
