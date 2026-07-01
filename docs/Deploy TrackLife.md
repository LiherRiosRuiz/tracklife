# Deploy TrackLife — Ruta a producción y Play Store

Actualizado: 2026-06-30. Objetivo: publicar TrackLife **gratis** (sin comprar dominio) y de ahí al Play Store.

## Principio: no hace falta comprar dominio para lanzar

Un deploy gratis da una URL pública con HTTPS (`*.vercel.app`, `*.onrender.com`…). Eso basta para PWA instalable **y** para empaquetar como TWA al Play Store. El dominio propio (`tracklife.fit`, etc.) se enchufa después en 5 min sin rehacer nada.

> Por qué LIHER no puede hacer los pasos de cuenta/pago: requieren tarjeta, identidad, verificación email/SMS, CAPTCHA y aceptar términos como el titular. No automatizable de forma legítima.

## Arquitectura pública (dos piezas)

| Pieza | Qué es | Hosting gratis recomendado |
|-------|--------|----------------------------|
| Front | Next.js 16 SSR (`projects/web/web3-next`) | **Vercel** (deploy nativo de Next, HTTPS auto, dominio `*.vercel.app`) |
| API | Laravel 13 + MongoDB (`projects/web/api-laravel`) | **Railway** o **Render** (free tier PHP) + **MongoDB Atlas** (free M0 512MB) |

El front (Vercel) habla con la API por `API_INTERNAL_URL` / `NEXT_PUBLIC_API_URL` → apuntar a la URL pública de la API.

## Pasos del usuario (gratis, ~15 min en total, requieren tu login/tarjeta-no)

1. **MongoDB Atlas**: crear cluster free M0, usuario DB, copiar la connection string.
2. **API (Railway/Render)**: conectar repo, root `projects/web/api-laravel`, variables `APP_KEY`, `MONGODB_URI` (la de Atlas), `DB_CONNECTION=mongodb`. Deploy → te da `https://<algo>.up.railway.app`.
3. **Front (Vercel)**: conectar repo `LiherRiosRuiz/tracklife`, root `projects/web/web3-next`, env `API_INTERNAL_URL` y `NEXT_PUBLIC_API_URL` = URL de la API, `SESSION_*` por defecto. Deploy → `https://<algo>.vercel.app`.

## Lo que LIHER deja preparado (autónomo) — TODO listo

- [x] PWA instalable: `app/manifest.ts`, iconos **PNG 192/512 + maskable 512** (`scripts/gen-icons.mjs`), service worker.
- [x] **Cookie de sesión** ya se sirve con `Secure` en producción (`NODE_ENV==="production"` → Vercel lo pone solo). Nada que tocar.
- [x] **CORS configurable por env**: `config/cors.php` lee `CORS_ALLOWED_ORIGINS` (coma-separado). Solo pegas tu URL de Vercel.
- [x] **Plantillas de entorno**: `web3-next/.env.production.example` y `api-laravel/.env.production.example` con los nombres exactos y de dónde sacar cada valor.
- [x] **assetlinks**: `public/.well-known/assetlinks.template.json` (se rellena con el SHA256 en el paso TWA).
- [x] Overhaul mergeado a `master` → Vercel/Railway despliegan la rama de producción directamente.

## CHECKLIST EXACTO (pega valores, nada de código)

**1) MongoDB Atlas** (gratis): crea cluster M0 → Database Access: usuario+pass → Network Access: `0.0.0.0/0` → Connect → Drivers → copia la URI. Guárdala.

**2) API en Railway** (o Render): New Project → Deploy from GitHub → repo `LiherRiosRuiz/tracklife` → **Root Directory** `projects/web/api-laravel` (usa su `Dockerfile`). En Variables, pega las de `api-laravel/.env.production.example`:
   - `APP_KEY` (genera con `php artisan key:generate --show` o lo genero yo), `MONGODB_URI` (la de Atlas), `CORS_ALLOWED_ORIGINS` (tu URL de Vercel del paso 3), `APP_ENV=production`, `APP_DEBUG=false`.
   - Deploy → anota la URL pública, p.ej. `https://tracklife-api.up.railway.app`.

**3) Front en Vercel** (gratis): Add New Project → import `LiherRiosRuiz/tracklife` → **Root Directory** `projects/web/web3-next` (Vercel detecta Next). En Environment Variables pega las de `web3-next/.env.production.example`:
   - `API_INTERNAL_URL` y `NEXT_PUBLIC_API_URL` = la URL de la API del paso 2.
   - Deploy → anota la URL, p.ej. `https://tracklife.vercel.app`.

**4) Cerrar el círculo**: pon la URL de Vercel del paso 3 en `CORS_ALLOWED_ORIGINS` del paso 2 (redeploy API). Listo: app pública con HTTPS.

> Cuando tengas las 3 URLs, pásamelas y valido el flujo (registro/login/persistencia) y sigo con el empaquetado TWA.

## TWA → Google Play (tras tener la URL pública)

1. (LIHER) `npx @bubblewrap/cli init --manifest https://<url>/manifest.webmanifest` → `twa-manifest.json`.
2. (LIHER) `bubblewrap build` → keystore + `app-release-bundle.aab`. **Custodia del keystore = usuario.**
3. (Usuario) Google Play Console (pago único 25 USD), subir AAB, activar Play App Signing.
4. (Usuario→LIHER) copiar SHA256 de App Signing → `assetlinks.json` → redeploy.
5. (Usuario) ficha (Health & Fitness), capturas, política de privacidad, content rating, data safety → publicar.

## Dominio propio (opcional, cuando haya presupuesto)

`tracklife.com`/`.app` ocupados. Libres: `tracklife.fit` (recomendado: marca exacta + TLD fitness), `gettracklife.com` (.com estable). Registrador: Cloudflare (a coste) o Porkbun. Se añade como dominio personalizado en Vercel/Railway en minutos.

Ver también: [[mobile-pwa]], [[Roadmap TrackLife]], [[Pendientes]].
