import { AppNav } from "@/components/AppNav";
import { AuthGuard } from "@/components/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:ml-56 md:pb-8">
        {children}
      </main>
    </AuthGuard>
  );
}
