/**
 * Public URLs for the landing site.
 *
 * These were hardcoded to the local `.test` domains in every page, so a
 * production build shipped a landing whose every CTA ("Empezar gratis",
 * "Entrar") pointed at a host that only resolves on the dev machine — the whole
 * conversion funnel dead on arrival.
 *
 * Both are read at build time from the environment, with the local domains as
 * the fallback so `npm run dev` keeps working untouched.
 *
 * In production set, alongside the existing DOMAIN/WEB_TLS_ENABLED vars:
 *   PUBLIC_APP_URL=https://app.tudominio.com
 *   PUBLIC_SITE_URL=https://www.tudominio.com
 */
export const APP_URL: string = import.meta.env.PUBLIC_APP_URL ?? "http://app.tracklife.test";

export const SITE_URL: string = import.meta.env.PUBLIC_SITE_URL ?? "http://www.tracklife.test";
