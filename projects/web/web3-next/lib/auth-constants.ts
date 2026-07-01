// Nombre de la cookie httpOnly de sesión servida por los route handlers de Next.
// Distinta de la clave localStorage "tracklife_token" (dual-write durante la transición).
export const SESSION_COOKIE = "tracklife_session";

// Vida de la cookie de sesión. Los tokens Sanctum no caducan en el backend, así
// que una cookie larga es segura y mejora el "recuérdame" para usuarios reales:
// quien abra la app dentro de cualquier ventana de 30 días no pierde la sesión.
// (Sliding/refresh y migración cookie-only = sprint futuro, ver Pendientes.)
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días
