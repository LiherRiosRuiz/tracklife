"use client";

import { useEffect } from "react";

// Registra el service worker para habilitar la instalación (PWA/TWA).
// No-op si el navegador no soporta SW o estamos en SSR.
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registro best-effort; no rompe la app si falla */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
