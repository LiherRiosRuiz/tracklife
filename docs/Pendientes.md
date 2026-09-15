# Pendientes

Tareas abiertas del workspace. Actualizado: 2026-06-29 (revisión de vigencia: 2026-09-15 —
ver notas `[revisado 2026-09-15]` en los ítems verificados contra el estado real del repo;
el resto del documento no se tocó, así que puede seguir desactualizado en partes no revisadas).

Para el roadmap detallado de sprints futuros ver [[Roadmap TrackLife]].

---

## Infraestructura

- [x] **web1-astro crash-loop** — `[revisado 2026-09-15]` Ya no reproduce: `docker ps` muestra el contenedor `Up 2 weeks`, y `npm run build` corre limpio (4 páginas + sitemap + robots.txt). No se identificó cuándo se resolvió; puede haber sido incidental a trabajo posterior. Sin acción pendiente.
- [ ] **Automatizar portproxy WSL2 con Task Scheduler** — la IP de WSL2 cambia en cada reinicio. Automatizacion ya construida (2026-06-08, recomendacion #5 de [[Skills Pendientes]]): `infra/scripts/portproxy.sh` + `infra/scripts/install-portproxy-task.ps1` + target `make portproxy-install`. Falta la primera ejecucion manual con permisos de Administrador para registrar la tarea programada
- [ ] **Certificados SSL** — si el stack se abre a internet, usar Let's Encrypt vía Traefik ACME
- [ ] **Backups automáticos de MongoDB** — automatizacion ya construida (2026-06-08, recomendacion #5 de [[Skills Pendientes]]): `infra/mongodb/backup.sh` (`mongodump --gzip --archive`, rotacion configurable, restore documentado) + target `make mongo-backup`. Falta la primera corrida manual de verificacion antes de confiar en el flujo de forma rutinaria
- [ ] **Monitorización** — considerar añadir Grafana/Prometheus para métricas del stack

---

## TRACKLIFE — API

- [ ] **Migrar de SQLite a MongoDB** — el package `mongodb/laravel-mongodb` está instalado y `DB_CONNECTION=mongodb` configurado en docker-compose. Solo falta ajustar `config/database.php` y verificar que las migraciones funcionan con MongoDB driver
- [x] **Tests reales** — 74 Feature Tests verdes (274 assertions): Auth (+5), Meals, Workouts (8), Biometrics (9), Activities (8), Dashboard, Exercises, WorkoutPlans (2026-06-25, Sprint P3.1)
- [ ] **Deltas biométricos** — `BiometricController::today()` no calcula deltas. Gap documentado en P3.1; si se requieren, abrir sub-sprint aparte
- [ ] **Providers de wearables** — Zepp y Whoop OAuth2. La infraestructura de `WearableConnection` está lista, falta el flujo OAuth y el sync real
- [ ] **Versionado de API** — cuando haya >10 endpoints estables, considerar `/api/v1/`
- [x] **CLAUDE.md de projects/web/api-laravel/ desactualizado** — `[revisado 2026-09-15]` Ya corregido: el archivo actual describe correctamente `routes/api.php` (~15 controllers) y MongoDB como "live default connection — fully wired, not a pending integration". No quedan las afirmaciones falsas.
- [x] **Fix crítico aislamiento de tests** — 2026-06-29: los tests corrían contra la BD producción `tracklife` y borraban la colección `users` en cada `php artisan test` (las env reales de Docker ensombrecían `phpunit.xml`, ni `force="true"` se aplicaba). Sintoma: usuarios desaparecían y el login daba "Credenciales incorrectas". Resuelto: `TestCase::setUp()` fuerza BD `_testing` + `DB::purge` + guardia allowlist en `MongoTestCleanup` + test de regresión. Verificado: sentinela en producción sobrevive a la suite completa. commit `eca9b52`.
- [x] **Fix higiene APP_KEY** — 2026-06-29: `docker-entrypoint.sh` regeneraba la APP_KEY en cada arranque (rotándola). Ahora solo se genera si no existe (idempotente). No era la causa del bug de persistencia pero es un footgun real.
- [x] **Mensaje de login ambiguo** — `[revisado 2026-09-15]` Decisión tomada y documentada acá: se deja el mensaje genérico "Credenciales incorrectas" a propósito (`AuthController.php:65`, confirmado sin cambios) — es buena práctica anti-enumeración de usuarios, no un bug de UX. No hay acción pendiente.

---

## TRACKLIFE — App

- [x] **Módulo Hevy** — completado 2026-06-10: biblioteca de ejercicios con imágenes, planes CRUD, workout activo con timer y RestTimer, flujo completo
- [x] **Fix página ejercicios** — completado 2026-06-19: migración a `useApiData`, key bug corregido, filtros client-side, fix doble convención músculo, skeletons, ErrorState
- [x] **Repo GitHub creado** — LiherRiosRuiz/tracklife (privado, 208 archivos, 17 commits, 2026-06-19)
- [x] **Stop hook — auto git push** — `.claude/settings.json` con hook `Stop`; commit + push automático al finalizar cada sesión (2026-06-19)
- [x] **Sprint P1** — completado 2026-06-21: 9 páginas placeholder (nutricion/plan, nutricion/favoritos, comunidad/buscar, coach/plan, coach/insights, biometricos/cuerpo, entrenamiento/progreso + ajuste BiometricController)
- [x] **Sprint P2** — completado 2026-06-21: Form Requests (20), Zod Frontend, Landing Redesign, API Resources (8), Dashboard mejorado con WeeklyChart. 44/44 tests verdes.
- [x] **Sprint P3.1** — completado 2026-06-25: WorkoutTest (8), BiometricTest (9), ActivityTest (8), AuthTest (+5). 74/74 tests verdes (274 assertions).
- [x] **Sprint P3.2** — completado 2026-06-25: httpOnly cookie via Route Handlers + Dashboard Server Component + dual-write. 79/79 tests verdes.
- [x] **Sprint P3.3** — completado 2026-06-25: busqueda real usuarios (GET /api/users/search). 79/79 tests verdes.
- [x] **Sub-sprint perfil usuario** — completado 2026-06-29: página perfil [id], endpoint protegido (fix seguridad), UserProfileTest 5 tests. 84/84 verdes.
- [~] **Overhaul estético "Bioluminiscencia"** — grueso COMPLETADO (rama `feature/ui-overhaul`, 2026-06-30, sin merge). Hecho: 4 skills de diseño en SDD; F1 design system (tokens OKLCH, Sora+JetBrains, primitivos Stat/Ring/Badge/EmptyState/Input/Brand); dashboard; login/registro/AppNav; **F3 consistencia total (deuda de color a 0 en 14 páginas + 6 componentes)**; **F4 motion CSS (ring-fill, fade-in, active:scale; sin framer-motion)**; **F5 PWA (manifest, iconos SVG+maskable, SW, theme)**; **landing web1-astro en lockstep**. Base a11y (focus-visible, reduced-motion). Cada commit build OK + lint 0. Pendiente: onboarding dedicado, F4 avanzado (framer-motion + celebraciones), PNG icons 192/512 + empaquetado TWA. Plan: Platón (crónica 2026-06-30).
- [x] **"Recuérdame" verificado + cookie 30 días** — 2026-06-30: el "no recuerda usuarios" era residuo del wipe de tests (cuenta borrada). Verificado end-to-end que registro/login/sesión persisten. Cookie de sesión extendida 7→30 días (`SESSION_MAX_AGE`). Cuenta demo: `demo@tracklife.test` / `password123`.
- [x] **Auth cookie-only (sin localStorage)** — `[revisado 2026-09-15]` Completado (SDD change `remove-token-localstorage`, mergeado 2026-09-02): `lib/api.ts` retarget a `/api/proxy/...` (BFF same-origin, adjunta el Bearer server-side desde la cookie httpOnly), token eliminado de JS por completo, redirect global 401→`/login`. Verificado: `rg "localStorage"` sin hits de auth token.
- [ ] **Páginas con datos reales** — calendario, progreso (recharts), plan nutricional, favoritos, comunidad (P4 en [[Roadmap TrackLife]])
- [x] **PWA instalable** — 2026-06-30/07-01: manifest standalone, service worker, iconos SVG + **PNG 192/512/maskable** (`scripts/gen-icons.mjs`), theme color. Ver [[Deploy TrackLife]].
- [x] **Onboarding de activación** — 2026-07-01: `/app/onboarding` (bienvenida → objetivo → macros → listo) + celebración de logro (confetti/haptic). Registro redirige aquí.
- [x] **Merge overhaul → master + push** — 2026-07-01: todo el overhaul (F1–F5 + landing + onboarding + PWA + prep deploy) mergeado a `master` y empujado a GitHub (`e572de5`). Rama de producción lista para desplegar.
- [x] **Prep de deploy completa** — 2026-07-01: CORS por env, `.env.production.example` (front y API), `assetlinks.template.json`, y CHECKLIST EXACTO en [[Deploy TrackLife]]. Solo falta pegar valores.
- [ ] **Deploy público (bloqueante = usuario, gratis)** — 3 altas: MongoDB Atlas + Railway/Render (API) + Vercel (front), conectar repo, pegar env. En cuanto haya URLs públicas, LIHER valida el flujo y hace el empaquetado TWA (Bubblewrap → AAB) para Play Store. Pasos exactos en [[Deploy TrackLife]].
- [x] **Ronda de hardening pre-lanzamiento (2026-09-04/06)** — `[revisado 2026-09-15]` No estaba registrada acá. Resumen: (1) 6 sitios de errores silenciosos (`console.error`-only) migrados a feedback visible — change `silent-error-handling`, 6 PRs (#31-#36), archivado en `openspec/changes/archive/`; (2) auditoría de `authorize()` en los 22 FormRequests de Laravel — sin IDOR explotable hoy, 3 FormRequests huérfanos cableados (PR #37); (3) `avatar_url` endurecido a `url` válida (PR #38) y proxeado same-origin (`/api/avatar/[userId]`) para cerrar un vector real de tracking-pixel de terceros; (4) `composer audit`/`npm audit` — CVEs reales en guzzle/commonmark corregidas (PR #39), Next.js bump 16.2.7→16.3.4 + audit fix (0 vulnerabilidades en web3-next); web1-astro quedó con 2 CVEs de bajo riesgo real pendientes de un Astro 6→7 (breaking, diferido a propósito — ver nota abajo); (5) `next/image` en los 5 sitios de imágenes; (6) 404 personalizadas, `sitemap.xml`, `robots.txt` y metadata real en login/registro para ambos front-ends. Todo mergeado a `master`, tests/lint/build verdes en los 3 subproyectos.
- [ ] **Astro 6 → 7 (web1-astro)** — `[agregado 2026-09-15]` Bump mayor pendiente para cerrar 2 CVEs de `esbuild`/`sharp` en `npm audit`. Diferido a propósito: ambas CVEs tienen exposición real ~nula en este deploy (esbuild es dev-server-Windows-only; sharp solo importa si se usa `astro:assets`, que no se usa acá). Requiere su propia pasada de QA visual/funcional antes de intentarlo, no meterlo en un sweep de dependencias de rutina.
- [x] **Tests frontend** — `[revisado 2026-09-15]` Vitest + @testing-library/react instalados y en uso (Strict TDD activo desde entonces); 70/70 tests verdes al día de hoy en web3-next. Playwright no se instaló como dependencia del proyecto — se usó puntualmente vía CDP/Chromium del sistema para smoke tests manuales, no como parte del suite automatizado.

---

## TRACKLIFE — Landing

- [x] **Páginas `/como-funciona` y `/precios`** — implementadas en Sprint P2 (2026-06-21): redesign completo con Tailwind 4, hero, stats, features, CTA

---

## Framework Platón SDD

`[revisado 2026-09-15]` Esta sección quedó obsoleta: `.sdd/` ya no existe en el repo.
El flujo SDD actual lo aporta `gentle-ai` (skills `sdd-*` en `.claude/`, ver CLAUDE.md
raíz) — un framework distinto, no una evolución de Platón. Los ítems de abajo
(Guardian Angel, calibración, tmux launcher) no tienen equivalente directo conocido
en gentle-ai; no se investigó si hace falta reemplazarlos. Dejados sin marcar por
las dudas, pero ya no son accionables tal como están escritos.

- [ ] ~~**Guardian Angel instalado** — ejecutar `bash .sdd/guard/install.sh` para activar el pre-commit hook~~ (`.sdd/` no existe)
- [ ] ~~**Tests Vitest** — script de bootstrap `make test-setup`~~ (superado: Vitest ya está instalado y en uso en web3-next, ver sección App)
- [ ] ~~**Calibración formal** — `make calibrate`~~ (`.sdd/` no existe)
- [ ] ~~**tmux integration** — launcher Platón~~ (`.sdd/` no existe)
- [x] **Skills pendientes** — las 7 recomendaciones de [[Skills Pendientes]] completadas el 2026-06-08: skill MongoDB, calibration runner, test bootstrap, skill DevOps, portproxy/backup automatizados, `/decide`, skill de seguridad. Quedan acciones de seguimiento humano (ver puntos de Calibración formal, Tests Vitest e Infraestructura arriba)

---

## Workspace

- [ ] **Convención de nombres** para nuevos proyectos en `projects/`
- [ ] **SSL local** — considerr mkcert para dominios `.test` con HTTPS

---

## Completado ✓

- [x] Stack completo TRACKLIFE funcionando (landing + app + API)
- [x] Auth completa (Sanctum tokens)
- [x] Dashboard con macros, insights coach, feed preview
- [x] Escáner de productos con Open Food Facts + Health Score
- [x] Workout log con volumen calculado + feed social
- [x] Biométricos CRUD completo
- [x] Platón SDD v2.0: memoria persistente, skills, delegación, Guardian Angel
- [x] Dominios tracklife.test cablelados en Traefik

---

Ver también: [[Home]], [[TRACKLIFE]], [[Roadmap TrackLife]], [[Platon SDD]], [[Skills Pendientes]]
