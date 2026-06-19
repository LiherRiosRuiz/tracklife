import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-black hover:bg-green-400",
    secondary: "border border-border bg-card hover:border-accent",
    ghost: "text-muted hover:text-foreground",
  }[variant];

  if (href) {
    return (
      <Link href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color = "bg-accent",
}: {
  label: string;
  value: number;
  target: number;
  color?: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span>
          {Math.round(value)} / {target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-green-400 bg-green-950" : score >= 40 ? "text-yellow-400 bg-yellow-950" : "text-red-400 bg-red-950";
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${color}`}>
      {score}/100
    </span>
  );
}
