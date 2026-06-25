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
| P3.2 — Server Components | [ ] Pendiente | — |
| P3.3 — Búsqueda usuarios real | [ ] Pendiente | — |
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

### P3.2 Server Components en Dashboard

- Convertir `/app/app/page.tsx` a Server Component donde sea posible
- `WeeklyChart.tsx` sigue siendo client (Recharts requiere browser)
- Separar data-fetching del render: `fetch()` directo en Server Component
- Beneficio: menos JS en cliente, mejor TTFB

### P3.3 Búsqueda real de usuarios

- Endpoint: `GET /api/users/search?q=` en Laravel
- Reemplazar búsqueda client-side en `comunidad/buscar/page.tsx`
- Mínimo 3 tests: resultados, sin autenticación 401, query vacía

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
| Búsqueda client-side | `comunidad/buscar/page.tsx` L11 | TODO: GET /api/users/search (P3.3) |
| Favoritos en localStorage | `nutricion/favoritos/page.tsx` | TODO: persistir en API (P4.2) |
| Feed mock | `api-laravel/FeedController.php` | TODO: lógica real de following (P4.3) |
| Coach insights mock | `api-laravel/CoachController.php` | TODO: basado en datos reales (P4.4) |
| Deltas biométricos | `BiometricController::today()` | Gap documentado — decidir P3 vs P4 |

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
