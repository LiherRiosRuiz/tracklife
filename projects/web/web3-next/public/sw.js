// Service worker mínimo de TrackLife.
// Habilita la instalabilidad (PWA / TWA) con un fetch handler presente.
// Sin caché agresiva por ahora (evita servir contenido stale en desarrollo).
// Offline avanzado (precache de app shell) = fase futura con Serwist.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough a red. La mera presencia del handler satisface el requisito
  // de instalabilidad de Chrome/Android.
});
