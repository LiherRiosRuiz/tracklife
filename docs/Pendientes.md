# Pendientes

Tareas abiertas del workspace. Actualizado: 2026-06-06.

---

## Infraestructura

- [ ] **Automatizar portproxy WSL2 con Task Scheduler** — la IP de WSL2 cambia en cada reinicio. Automatizacion ya construida (2026-06-08, recomendacion #5 de [[Skills Pendientes]]): `infra/scripts/portproxy.sh` + `infra/scripts/install-portproxy-task.ps1` + target `make portproxy-install`. Falta la primera ejecucion manual con permisos de Administrador para registrar la tarea programada
- [ ] **Certificados SSL** — si el stack se abre a internet, usar Let's Encrypt vía Traefik ACME
- [ ] **Backups automáticos de MongoDB** — automatizacion ya construida (2026-06-08, recomendacion #5 de [[Skills Pendientes]]): `infra/mongodb/backup.sh` (`mongodump --gzip --archive`, rotacion configurable, restore documentado) + target `make mongo-backup`. Falta la primera corrida manual de verificacion antes de confiar en el flujo de forma rutinaria
- [ ] **Monitorización** — considerar añadir Grafana/Prometheus para métricas del stack

---

## TRACKLIFE — API

- [ ] **Migrar de SQLite a MongoDB** — el package `mongodb/laravel-mongodb` está instalado y `DB_CONNECTION=mongodb` configurado en docker-compose. Solo falta ajustar `config/database.php` y verificar que las migraciones funcionan con MongoDB driver
- [ ] **Tests reales** — actualmente solo hay stubs ExampleTest. Implementar Feature Tests para Auth, Meals, Workouts, Biometrics
- [ ] **Providers de wearables** — Zepp y Whoop OAuth2. La infraestructura de `WearableConnection` está lista, falta el flujo OAuth y el sync real
- [ ] **Versionado de API** — cuando haya >10 endpoints estables, considerar `/api/v1/`

---

## TRACKLIFE — App

- [x] **Módulo Hevy** — completado 2026-06-10: biblioteca de ejercicios con imágenes, planes CRUD, workout activo con timer y RestTimer, flujo completo
- [ ] **Páginas placeholder** — pendientes: `/app/entrenamiento/calendario` (con datos reales), `/app/entrenamiento/progreso` (gráficos recharts), `/app/nutricion/plan`, `/app/nutricion/favoritos`, `/app/comunidad/buscar`
- [ ] **PWA** — manifest + service worker para instalación en móvil
- [ ] **Tests frontend** — instalar Vitest + @testing-library/react para web3-next

---

## TRACKLIFE — Landing

- [ ] **Páginas `/como-funciona` y `/precios`** — actualmente son placeholders de Astro

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

Ver también: [[Home]], [[TRACKLIFE]], [[Platon SDD]], [[Skills Pendientes]]
