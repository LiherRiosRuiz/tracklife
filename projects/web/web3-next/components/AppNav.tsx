"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Apple,
  Dumbbell,
  Heart,
  Home,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Brand } from "@/components/ui";

const links = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/nutricion", label: "Nutrición", icon: Apple },
  { href: "/app/entrenamiento", label: "Entreno", icon: Dumbbell },
  { href: "/app/biometricos", label: "Biométricos", icon: Heart },
  { href: "/app/comunidad", label: "Comunidad", icon: Users },
  { href: "/app/coach", label: "Coach", icon: Activity },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" aria-label="Inicio">
            <Brand className="text-lg" />
          </Link>
          <div className="flex items-center gap-3 text-sm text-fg-muted">
            <span className="hidden sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="rounded-lg p-2 transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav (móvil) — con safe-area para dispositivos con notch / PWA */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-12 flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-fg-subtle hover:text-fg-muted"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar (desktop) */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-surface md:pt-20">
        <div className="flex flex-col gap-1 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-accent-dim text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
