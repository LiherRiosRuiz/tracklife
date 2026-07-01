"use client";

import { useEffect, useRef } from "react";

// Celebración de logro: confetti canvas ligero (sin dependencias) + haptic.
// Respeta prefers-reduced-motion (no anima). Se auto-limpia al terminar.
export function Celebration({ duration = 1800 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Haptic (móvil)
    try {
      navigator.vibrate?.([12, 40, 12]);
    } catch {
      /* no-op */
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);

    const read = (v: string, fallback: string) => {
      const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      return c || fallback;
    };
    const colors = [
      read("--color-accent", "#86ef2b"),
      read("--color-cyan", "#33d6ea"),
      read("--color-amber", "#f2b705"),
      read("--color-coral", "#f2664e"),
    ];

    type P = { x: number; y: number; vx: number; vy: number; s: number; rot: number; vr: number; c: string };
    const N = 120;
    const parts: P[] = Array.from({ length: N }, () => ({
      x: W / 2,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (Math.random() - 1.1) * 16 * dpr,
      s: (4 + Math.random() * 5) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));

    const g = 0.35 * dpr;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      const alpha = Math.max(0, 1 - t / duration);
      for (const p of parts) {
        p.vy += g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
