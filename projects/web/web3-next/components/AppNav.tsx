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

const links = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/nutricion", label: "Nutrición", icon: Apple },
  { href: "/app/entrenamiento", label: "Entreno", icon: Dumbbell },
  { href: "/app/biometricos", label: "Biométricos", icon: Heart },
  { href: "/app/comunidad", label: "Comunidad", icon: Users },
  { href: "/app/coach", label: "Coach", icon: Activity },
];

export function AppNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="text-lg font-black tracking-wider text-accent">
            TRACKLIFE
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{user?.name}</span>
            <button onClick={logout} className="rounded-lg p-2 hover:bg-card" aria-label="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden">
        <div className="flex justify-around py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? "text-accent" : "text-muted"}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-card md:pt-20">
        <div className="flex flex-col gap-1 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-accent-dim text-accent" : "text-muted hover:bg-background"}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
