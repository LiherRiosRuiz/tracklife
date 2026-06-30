# Pendientes

Tareas abiertas del workspace. Actualizado: 2026-06-29.

Para el roadmap detallado de sprints futuros ver [[Roadmap TrackLife]].

---

## Infraestructura

- [ ] **web1-astro crash-loop** — Contenedor Landing en estado `Restarting` desde 2026-06-25 apertura P3.1. Causas probables: dependencia faltante, error en build, incompatibilidad Astro 6. Impacto: landing no accesible, app funcional. Scope diferido a sesion dedicada.
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
- [ ] **CLAUDE.md de projects/web/api-laravel/ desactualizado** — Afirma "no routes/api.php" y "MongoDB no cableado", pero el codigo real tiene API completa (~20 controladores) + Mongo activo. Tarea mantenimiento documentacion.
- [x] **Fix crítico aislamiento de tests** — 2026-06-29: los tests corrían contra la BD producción `tracklife` y borraban la colección `users` en cada `php artisan test` (las env reales de Docker ensombrecían `phpunit.xml`, ni `force="true"` se aplicaba). Sintoma: usuarios desaparecían y el login daba "Credenciales incorrectas". Resuelto: `TestCase::setUp()` fuerza BD `_testing` + `DB::purge` + guardia allowlist en `MongoTestCleanup` + test de regresión. Verificado: sentinela en producción sobrevive a la suite completa. commit `eca9b52`.
- [x] **Fix higiene APP_KEY** — 2026-06-29: `docker-entrypoint.sh` regeneraba la APP_KEY en cada arranque (rotándola). Ahora solo se genera si no existe (idempotente). No era la causa del bug de persistencia pero es un footgun real.
- [ ] **Mensaje de login ambiguo** — `AuthController::login` devuelve "Credenciales incorrectas" tanto si el email no existe como si la contraseña es errónea. Decisión pendiente: el mensaje genérico es buena práctica anti-enumeración de usuarios, así que probablemente dejarlo; documentar la decisión. Baja prioridad.

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
- [~] **Overhaul estético "Bioluminiscencia"** — en curso (rama `feature/ui-overhaul`, 2026-06-30). Hecho: 4 skills de diseño en SDD; F1 design system (tokens OKLCH, Sora+JetBrains, primitivos Stat/Ring/Badge/EmptyState/Input/Brand); rediseño dashboard; propagación a login/registro/AppNav; base a11y (focus-visible, reduced-motion). Pendiente: F3 (resto de ~40 pantallas), F4 (motion/framer-motion), F5 (PWA). Plan completo: Platón (ver crónica 2026-06-30).
- [x] **"Recuérdame" verificado + cookie 30 días** — 2026-06-30: el "no recuerda usuarios" era residuo del wipe de tests (cuenta borrada). Verificado end-to-end que registro/login/sesión persisten. Cookie de sesión extendida 7→30 días (`SESSION_MAX_AGE`). Cuenta demo: `demo@tracklife.test` / `password123`.
- [ ] **Auth cookie-only (sin localStorage)** — DIRECCIÓN A LARGO PLAZO. Hoy hay dos fuentes de verdad (cookie httpOnly para SSR + localStorage para client). Migrar TODAS las llamadas API a route handlers same-origin (BFF) que adjunten el token desde la cookie server-side → eliminar token de JS (cierra superficie XSS) + sliding refresh (middleware) para que usuarios activos nunca caduquen. Es el P5.1 "retirar localStorage" + "migrar 18 páginas client". Sprint dedicado.
- [ ] **Páginas con datos reales** — calendario, progreso (recharts), plan nutricional, favoritos, comunidad (P4 en [[Roadmap TrackLife]])
- [ ] **PWA** — manifest + service worker + iconos maskable (F5; prerequisito de Play Store vía TWA/Bubblewrap — ver [[mobile-pwa]])
- [ ] **Tests frontend** — instalar Vitest + @testing-library/react + Playwright para web3-next (F0 del overhaul)

---

## TRACKLIFE — Landing

- [x] **Páginas `/como-funciona` y `/precios`** — implementadas en Sprint P2 (2026-06-21): redesign completo con Tailwind 4, hero, stats, features, CTA

---

## Framework Platón SDD

- [ ] **Guardian Angel instalado** — ejecutar `bash .sdd/guard/install.sh` para activar el pre-commit hook
- [ ] **Tests Vitest** — script de bootstrap ya construido (2026-06-08, recomendación #3 de [[Skills Pendientes]]): `make test-setup PROJECT=<web1-astro|web2-nuxt|web3-next>` instala vitest + config + test ejemplo en cada contenedor. Falta ejecutarlo con el stack arriba (`make up`) y, tras verificar, marcar `test_ready: true` en `config.yaml`
- [ ] **Calibración formal** — runner ya construido (2026-06-08, recomendación #2 de [[Skills Pendientes]]): `make calibrate [PROJECT=...]` ejecuta los 6 bloques de checks y persiste `last_run`/`result`/`blockers`/`warnings` en `calibration.status`. Falta ejecutarlo con el stack arriba para obtener la primera medición real
- [ ] **tmux integration** — launcher Platón con múltiples paneles (CLI + make ps + logs)
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
