import Link from "next/link";
import type { ComponentType, CSSProperties, InputHTMLAttributes, ReactNode } from "react";

/* Wordmark de marca con gradiente accent→cyan */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-accent to-cyan bg-clip-text font-extrabold tracking-wider text-transparent ${className}`}
    >
      TRACKLIFE
    </span>
  );
}

/* Input de formulario consistente con el design system */
export function Input({
  error = false,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border bg-bg px-4 py-3 text-sm outline-none transition-colors placeholder:text-fg-subtle focus:border-accent ${
        error ? "border-danger" : "border-border"
      } ${className}`}
    />
  );
}

export function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 ${elevated ? "shadow-md" : ""} ${className}`}
    >
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
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-on-accent hover:bg-accent-strong",
    secondary: "border border-border bg-surface text-fg hover:border-accent hover:text-accent",
    ghost: "text-fg-muted hover:text-fg",
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
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
    </div>
  );
}

/* ── Métrica: label pequeño + número héroe con tabular-nums ─────────────────── */
export function Stat({
  label,
  value,
  unit,
  color,
  size = "lg",
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  color?: string;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const valueSize = { md: "text-2xl", lg: "text-3xl", xl: "text-5xl" }[size];
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className={`tabular ${valueSize} font-extrabold leading-tight`} style={color ? { color } : undefined}>
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-fg-muted">{unit}</span>}
      </p>
    </div>
  );
}

/* ── Ring de progreso: la firma visual (estilo Apple/Whoop) ─────────────────── */
export function Ring({
  value,
  size = 132,
  stroke = 12,
  color = "var(--color-accent)",
  track = "var(--color-border)",
  glow = true,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  glow?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const offset = circ * (1 - pct);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="animate-ring"
          style={
            {
              "--ring-circ": circ,
              ...(glow ? { filter: `drop-shadow(0 0 6px ${color})` } : {}),
            } as CSSProperties
          }
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
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
        <span className="text-fg-muted">{label}</span>
        <span className="tabular">
          {Math.round(value)} / {target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    accent: "bg-accent-dim text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    neutral: "bg-surface-2 text-fg-muted",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones}`}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  return <Badge tone={tone}>{score}/100</Badge>;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon?: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {Icon && <Icon size={32} strokeWidth={1.75} className="mb-3 text-fg-subtle" />}
      <p className="font-semibold">{title}</p>
      {message && <p className="mt-1 text-sm text-fg-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
