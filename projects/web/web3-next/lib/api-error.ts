/**
 * Decisiones puras para mostrar fallos de API. Sin React, sin DOM.
 *
 * Contrato de errores de `lib/api.ts` (verificado 2026-09-04):
 *  - Fallo HTTP     -> Error con `.status` = código real y `.message` = body.message
 *                      | res.statusText | "Error de API"  (api.ts:117-120)
 *  - Timeout        -> Error PLANO, `.name === "Error"`, SIN `.status`,
 *                      `.message` = la constante de abajo            (api.ts:105-109)
 *  - Fallo de red   -> lo que rechace `fetch` (TypeError), sin `.status` (api.ts:110)
 */

/** Literal exacto que lanza `lib/api.ts` al abortar por timeout (api.ts:108). */
export const API_TIMEOUT_MESSAGE = "La petición tardó demasiado (timeout 10s)";

type ApiError = Error & { status?: number };

function asApiError(error: unknown): ApiError | null {
  return error instanceof Error ? (error as ApiError) : null;
}

/**
 * El timeout no es un AbortError: `api.ts` lo captura y relanza un Error plano,
 * así que el único discriminante disponible es "sin status + mensaje exacto".
 */
function isTimeout(error: ApiError): boolean {
  return error.status === undefined && error.message === API_TIMEOUT_MESSAGE;
}

/** Solo el 404 real de la API. Cualquier otro fallo NO es "no existe". */
export function isNotFound(error: unknown): boolean {
  return asApiError(error)?.status === 404;
}

/**
 * Mensaje a mostrar, o `null` si no hay que mostrar nada.
 *
 * - 401  -> `null`: `api.ts` ya redirige a /login; pintar un error solo produce
 *           un parpadeo rojo durante la navegación.
 * - timeout -> su propio mensaje (es más útil que el fallback).
 * - 4xx  -> el mensaje de la API (texto en español y accionable de Laravel),
 *           salvo que venga vacío (statusText es "" en HTTP/2).
 * - resto (5xx, red, valores no-Error) -> el fallback local en español; nunca
 *           se filtra `res.statusText` en inglés ("Internal Server Error").
 */
export function toErrorMessage(error: unknown, fallback: string): string | null {
  const e = asApiError(error);
  if (!e) return fallback;
  if (e.status === 401) return null;
  if (isTimeout(e)) return API_TIMEOUT_MESSAGE;

  const message = e.message.trim();
  const isClientError = e.status !== undefined && e.status >= 400 && e.status <= 499;
  return isClientError && message !== "" ? message : fallback;
}
