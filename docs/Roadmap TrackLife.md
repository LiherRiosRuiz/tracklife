# Roadmap TrackLife

Sprints futuros de TRACKLIFE. Actualizado: 2026-06-21.

Sprint P1 y P2 cerrados. Siguiente: P3.

---

## Estado de sprints

| Sprint | Estado | Tests |
|--------|--------|-------|
| P1 — Páginas placeholder (9) | [x] Completado 2026-06-21 | — |
| P2 — Calidad y estructura | [x] Completado 2026-06-21 | 44/44 |
| P3.1 — Tests de API (TDD) | [x] Completado 2026-06-25 | 74/74 |
| P3.2 — Server Components | [x] Completado 2026-06-25 | 79/79 |
| P3.3 — Búsqueda usuarios real | [x] Completado 2026-06-25 | 79/79 |
| P4 — Funcionalidades reales | [ ] Pendiente | — |
| P5 — Producción y pulido | [ ] Pendiente | — |

---

## Sprint P3 — Tests de API completos + Optimización Frontend

**Objetivo**: cobertura de tests completa en backend + optimización frontend

### P3.1 Tests de API (TDD — backend) [x] COMPLETADO 2026-06-25

**Resultado:**
- `WorkoutTest.php` — 8 tests (CRUD, aislamiento por usuario, paginación)
- `BiometricTest.php` — 9 tests (guardar medidas, historial, validaciones)
- `ActivityTest.php` — 8 tests (registro actividad, filtros de fecha)
- `AuthTest.php` — 14 tests (+5 nuevos: password corto, email inválido, login vacío, username auto, duplicado)
- **Suite total: 74 tests / 274 assertions / 0 fallos**
- Metodología: TDD strict (RED → GREEN → REFACTOR) · cero cambios de producción
- Stack: Laravel 13 · MongoDB · `MongoTestCleanup` trait

**Gap documentado (decisión futura):**
- `BiometricController::today()` NO calcula "deltas" de biométricos
- Si se requieren, abrir sub-sprint feature aparte (no es test-only)

### P3.2 Server Components en Dashboard [x] COMPLETADO 2026-06-25

**Opcion A ejecutada:** httpOnly cookie servida via Route Handlers de Next.js 16 + dual-write cookie+localStorage (migracion incremental).

**Resultado:**
- `app/api/auth/{login,register,logout}/route.ts` — Route Handlers con httpOnly cookie (SameSite=Lax, Path=/, Max-Age 604800, Secure solo prod). Proxean a Laravel via `API_INTERNAL_URL=http://api-laravel:8000` (server-to-server, sin CORS).
- `lib/server-api.ts` — capa server-only que lee token de cookie via `cookies()` de next/headers. Lanza `UnauthenticatedError` sin sesion.
- `lib/auth-constants.ts` — constante `SESSION_COOKIE`.
- `lib/auth.tsx` — login/register/logout pasan por Route Handlers de Next; dual-write cookie+localStorage para compat con 18 paginas client.
- `app/app/page.tsx` — Dashboard reescrito como Server Component (fetcha server-side). `WeeklyChart` permanece client island.
- `app/app/loading.tsx` y `error.tsx` — boundaries anadidos.
- **Verificacion runtime:** Set-Cookie correcto con httpOnly, smoke test register/login/GET /app sin/con sesion validados. httpOnly confirmed (no accesible por JS).
- **Suite stable:** 79 tests verdes (sin cambios).

**Metodologia:** LIHER ejecuto directamente (subagentes truncados) siguiendo plan de Platon. API Laravel sin cambios (no-regresion).

**Deuda para futuro (P5.1+):**
- Retirar localStorage y dual-write
- Migrar 18 paginas client restantes a Server Components
- Refresh tokens, middleware.ts, re-sincronizacion sesiones viejas
- HTTPS en dev para flag Secure

### P3.3 Búsqueda real de usuarios [x] COMPLETADO 2026-06-25

**Resultado:**
- `UserSearchController::search()` — GET /api/users/search?q= (auth:sanctum)
- `UserSearchTest.php` — 5 tests (resultados, 401, query vacia, exclusion propio, match case-insensitive)
- `comunidad/buscar/page.tsx` — reescrito, busqueda real con debounce 300ms
- Respuesta segura: id, name, username, bio, avatar_url, streak_days (sin email, privacy)
- **Suite total:** 79 tests / 309 assertions / 0 fallos

---

## Sprint P4 — Funcionalidades reales

**Objetivo**: que las páginas placeholder tengan datos reales

### P4.1 Plan nutricional real

- `nutricion/plan/page.tsx` guarda macro targets via `PUT /api/user/macro-targets`
- Form ya tiene Zod (`macroTargetsSchema`) — conectar al API real
- Mostrar confirmación de guardado

### P4.2 Favoritos persistentes

- `nutricion/favoritos/page.tsx` usa localStorage actualmente
- Crear endpoint `POST/DELETE /api/favorites` en Laravel
- Migrar de localStorage a API

### P4.3 Feed de comunidad real

- `GET /api/feed` ya existe pero devuelve datos mock
- Implementar lógica real: posts de usuarios que sigues o todos si es público
- `POST /api/feed` para crear posts
- Botón "Like" conectado: `POST /api/feed/{id}/like`

### P4.4 Coach IA básico

- `GET /api/coach/daily` ya existe (devuelve insights mock)
- Generar insights reales basados en datos del usuario:
  - Si streak < 3: recordatorio
  - Si calorías de ayer < 80% objetivo: alerta
  - Si no hay workout en 3 días: recomendación

### P4.5 Plan semanal del coach

- `GET /api/coach/plan` — nuevo endpoint
- Genera plan basado en `transformation_goal` del usuario
- Reemplazar `WEEKLY_PLAN` estático en `coach/plan/page.tsx`

---

## Sprint P5 — Producción y pulido

**Objetivo**: listo para mostrar / desplegar

### P5.1 Auth hardening

- Rate limiting en `/api/login` (max 5 intentos / 15 min)
- Refresh token logic en Next.js (interceptor axios cuando 401)
- `RememberMe` checkbox en login

### P5.2 Onboarding

- Flujo post-registro: objetivo → macros → primera comida
- Redirigir usuario nuevo a `/app/objetivo` si no tiene `transformation_goal`

### P5.3 Perfil real

- `PUT /api/user/profile` conectado al formulario de `/app/perfil`
- Upload de avatar (Laravel + almacenamiento local o S3)

### P5.4 Tests E2E

- Playwright: login → dashboard → crear comida → ver en listado
- CI básico (GitHub Actions): tests Laravel + build Next.js

### P5.5 Variables de entorno producción

- `.env.production` para Next.js (NEXT_PUBLIC_API_URL real)
- Docker Compose de producción separado del dev

---

## Deuda técnica acumulada

| Item | Archivo | Notas |
|------|---------|-------|
| Plan semanal estático | `coach/plan/page.tsx` L20-28 | TODO: endpoint /api/coach/plan |
| Favoritos en localStorage | `nutricion/favoritos/page.tsx` | TODO: persistir en API (P4.2) |
| Feed mock | `api-laravel/FeedController.php` | TODO: lógica real de following (P4.3) |
| Coach insights mock | `api-laravel/CoachController.php` | TODO: basado en datos reales (P4.4) |
| Deltas biométricos | `BiometricController::today()` | Gap documentado — decidir P3 vs P4 |
| Link a perfil 404 | `comunidad/buscar/page.tsx` Button href="/app/comunidad/perfil/{id}" | Ruta NO EXISTE. GET /api/users/{id}/profile existe pero ninguna pagina Next la consume. Candidato sub-sprint: "Pagina perfil usuario" |

---

## Como re-engancharse

1. Leer `docs/Estado del Sistema.md` — estado actual del stack
2. Leer `docs/TRACKLIFE.md` — arquitectura y decisiones
3. Leer `docs/Roadmap TrackLife.md` — este archivo
4. Ejecutar `make ps` desde `/mnt/d/Compartida/LIHER` — ver qué está corriendo
5. Ejecutar `wsl -d Ubuntu docker exec api-laravel php artisan test` — confirmar 44 tests verdes
6. Abrir `http://app.tracklife.test/` con `liher@tracklife.test / password123`
7. Empezar por **P3.1 WorkoutTest** — es lo más bloqueante (cobertura de tests)

---

## Prioridad recomendada para próxima sesión

```
P3.1 (WorkoutTest + BiometricTest + ActivityTest) → P3.3 (búsqueda real) → P4.1 (plan nutricional real)
```

---

Ver también: [[TRACKLIFE]], [[Pendientes]], [[Estado del Sistema]]
