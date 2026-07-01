"use client";

import { useEffect, useState, useCallback } from "react";

export function RestTimer({
  seconds: initialSeconds,
  onFinish,
  onSkip,
}: {
  seconds: number;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      // Vibrate if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      onFinish();
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onFinish]);

  const pct = initialSeconds > 0 ? (remaining / initialSeconds) * 100 : 0;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  // Add/subtract time
  const adjustTime = useCallback((delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center">
        <p className="mb-2 text-sm font-medium text-fg-muted">Descanso</p>

        {/* Circular progress */}
        <div className="relative mx-auto mb-6 h-48 w-48">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold tabular-nums">
              {minutes}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Time adjust buttons */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => adjustTime(-15)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            -15s
          </button>
          <button
            onClick={() => adjustTime(15)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            +15s
          </button>
          <button
            onClick={() => adjustTime(30)}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent"
          >
            +30s
          </button>
        </div>

        <button
          onClick={onSkip}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-on-accent transition hover:bg-accent-strong"
        >
          Saltar descanso
        </button>
      </div>
    </div>
  );
}
