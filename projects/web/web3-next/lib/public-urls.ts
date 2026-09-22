/**
 * Public URLs, read from the environment at build time.
 *
 * `SITE_URL` points at the landing (web1-astro), which is where the legal pages
 * live — the registration form links to /terminos and /privacidad there. It is a
 * separate deployable from this app, hence a separate variable.
 *
 * In production set, alongside NEXT_PUBLIC_API_URL / NEXT_PUBLIC_APP_URL:
 *   NEXT_PUBLIC_SITE_URL=https://www.tudominio.com
 */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://app.tracklife.test";

export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://www.tracklife.test";
