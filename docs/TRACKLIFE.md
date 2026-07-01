# TRACKLIFE

Plataforma de transformación física basada en datos. Cubre nutrición, entrenamiento, biométricos y comunidad en una interfaz unificada.

**Inspiraciones de producto:**
- Nutrición: Yuka (escáner de productos), MyFitnessPal (diario)
- Entrenamiento gym: Hevy / Strong
- Actividad cardio: Strava
- Biométricos: Whoop / Zepp Health
- Comunidad: Strava feed social

---

## Arquitectura de la plataforma

```
Usuario
  │
  ├── www.tracklife.test   →  TRACKLIFE Landing (Astro 6)
  │                            Páginas: /, /como-funciona, /precios
  │                            CTA → app.tracklife.test/registro
  │
  └── app.tracklife.test   →  TRACKLIFE App (Next.js 16 + React 19)
           │                   Auth, dashboard, todas las funciones
           │
           └── api.tracklife.test  →  TRACKLIFE API (Laravel 13 + MongoDB)
                                        REST API con Sanctum tokens
```

### Dominios y acceso

| Dominio | Proyecto | Contenedor |
|---------|---------|-----------|
| `www.tracklife.test` | Landing Astro | `web1-astro` |
| `app.tracklife.test` | App Next.js | `tracklife` |
| `tracklife.test` | Alias de app | `tracklife` |
| `api.tracklife.test` | API Laravel | `api-laravel` |

---

## Módulos funcionales

### Nutrición
Inspirado en Yuka + MyFitnessPal.

- **Diario de comidas**: registro por comida (desayuno, almuerzo, cena, snack)
- **Macros**: seguimiento calórico con objetivos personalizados (cal, proteína, carbos, grasas)
- **Búsqueda de alimentos**: Open Food Facts API (15M productos)
- **Escáner de código de barras**: html5-qrcode → Open Food Facts → perfil nutricional
- **Health Score**: puntuación 0-100 basada en azúcares, sal, grasas saturadas, fibra, proteína, NOVA group y aditivos
- **Recetas**: biblioteca personal con totales por ración
- **Plan semanal**: (UI placeholder, pendiente backend)
- **Favoritos**: (UI placeholder)

### Entrenamiento
Inspirado en Hevi / Strong.

- **Log de gym**: sesiones con nombre + sets (ejercicio, peso, reps), volumen total calculado automáticamente
- **Biblioteca de ejercicios**: catálogo personalizable con muscle_group
- **Actividad cardio**: tipo + título + distancia (km) + duración (min) — inspirado en Strava
- **Calendario**: vista de historial (UI placeholder, backend listo)
- **Progreso**: (UI placeholder)

### Biométricos
Inspirado en Whoop / Zepp Health.

**Tipos de medición soportados:**
| Tipo | Descripción |
|------|-------------|
| `sleep_score` | Puntuación de sueño (0-100) |
| `hrv` | Heart Rate Variability (ms) |
| `resting_hr` | Frecuencia cardíaca en reposo (bpm) |
| `recovery_score` | Índice de recuperación (0-100) |
| `strain` | Carga de entrenamiento del día |
| `steps` | Pasos diarios |
| `weight` | Peso corporal (kg) |
| `body_fat` | Porcentaje de grasa corporal |
| `spO2` | Saturación de oxígeno (%) |

- **Resumen de hoy**: últimos valores de los 5 tipos clave
- **Histórico**: gráficos por tipo (recharts), configurable por días
- **Wearables**: integración con Zepp, Whoop, etc. via `WearableConnection` (connect + sync)
- **Subtemas en UI**: Corazón, Cuerpo, Sueño, HRV, Dispositivos

### Coach IA
Sistema de insights automáticos basado en datos del día.

Reglas de negocio en `CoachService`:
- **Proteína baja**: si consumo < 60% del objetivo → advertencia con gramos restantes
- **Fuerza inactivo**: si último workout > 3 días → recordatorio
- **Cardio inactivo**: si última actividad > 5 días → sugerencia
- **Recuperación baja**: si último `recovery_score` < 50 → warning de descanso
- **Todo bien**: mensaje motivacional si no hay alertas

Endpoint: `GET /api/coach/daily` → array de `{type, severity, message}`

### Comunidad
Inspirado en Strava feed social.

- **Feed**: posts automáticos al compartir workout, actividad o biométrico destacado
  - Tipos: `workout_completed`, `activity_completed`, `recovery_milestone`
- **Kudos**: like en posts del feed
- **Comentarios**: hilo de comentarios por post
- **Retos**: challenges con participant_ids y leaderboard (seeded: "7 días registrando comida", "30 días sin ultraprocesados")
- **Clubs**: grupos de usuarios (seeded: "TRACKLIFE Transformación")
- **Explorar** / **Buscar**: (UI placeholder)

### Racha (Streak)
`StreakService` actualiza `streak_days` en el User:
- Mismo día: no incrementa
- Día siguiente: +1
- Brecha > 1 día: reset a 1

Se activa al registrar cualquier comida. Se muestra en dashboard y header.

---

## Design System "Bioluminiscencia" (F1–F5, overhaul 2026-06-30/07-01)

**Paleta OKLCH** (no hex):
- Superficies: verde-petróleo oscuro (`--color-bg`, `--color-surface`)
- Texto: blanco verdoso (`--color-fg`)
- Marca: lima accent (`--color-accent`)
- Acentos: cyan, violet, amber, coral (data-viz)
- Semánticos: success, warning, danger

**Tipografía**:
- Display: **Sora** (Google Fonts, pesos 400/500/700)
- Datos: **JetBrains Mono** (monoespaciado, tabular-nums)

**Componentes en `components/ui.tsx`**:
- `<Brand>` — wordmark TRACKLIFE con gradiente
- `<Input>` — campo de formulario con validación
- `<Card>` — contenedor (puede elevar con `elevated`)
- `<Button>` — primary (accent), secondary (borde), ghost
- `<PageHeader>` — título + subtítulo
- `<Stat>` — métrica con label + número tabulado
- `<Ring>` — anillo circular de progreso (firma visual)
- `<Badge>` — insignia de estado (sin emojis)
- `<MacroBar>` — barra de macros (protein/carbs/fat por color)
- `<ScoreBadge>` — score coloreado
- `<EmptyState>` — estado vacío con ícono y CTA

**Motion CSS**:
- `@keyframes ring-fill` — anillo de progreso
- `@keyframes fade-in-up` — fade in suave
- Respeta `prefers-reduced-motion` (a11y)

**Iconos**: lucide-react (no emojis)

**Gráficos**: recharts (para biométricos y dashboard)

---

## Autenticación

Sanctum token-based authentication.

- Token almacenado en `localStorage` bajo la clave `tracklife_token`
- `AuthProvider` context (React): user + token + loading + login/register/logout
- `AuthGuard` component: redirige a `/login` si no autenticado (mientras carga, spinner)
- Token enviado como `Authorization: Bearer <token>` en cada request API

---

## Estado actual y roadmap

**Implementado:**
- Stack completo funcionando (landing + app + API)
- Auth completa (registro, login, me, logout)
- Dashboard con macros, racha, insights y feed preview
- Núcleo nutrición: registro de comidas, búsqueda, escáner, macros
- Entrenamiento: gym log, ejercicios, cardio
- Biométricos: CRUD completo + resumen hoy
- Coach: insights automáticos
- Social: feed, kudos, comentarios, retos, clubs
- Wearables: connect + sync (infra lista, providers sin implementar realmente)
- **Módulo Hevy completo (2026-06-10)**:
  - Biblioteca de 60 ejercicios con imágenes e instrucciones (dataset libre)
  - Filtros por grupo muscular y equipamiento
  - Página de detalle por ejercicio (imagen inicio/fin, músculos, instrucciones)
  - Planes de entrenamiento CRUD (ejercicios + sets con tipo/peso/reps/descanso)
  - Workout activo: timer de sesión, barra de progreso, sets completables con checkmark
  - RestTimer: círculo SVG animado con -15s/+15s/+30s y vibración
  - Flujo completo: Crear plan → Iniciar → Completar sets → RestTimer → Finalizar → Progreso
  - Flujo ad-hoc: Gym → Picker de ejercicios → Workout activo
  - Tests backend: ExerciseTest (4) + WorkoutPlanTest (7) — 13 tests, 41 assertions
- **Fix loading infinito (2026-06-13)**:
  - `lib/api.ts`: AbortController con timeout 10s en `request()` — fetch ya no cuelga infinitamente
  - `hooks/use-api-data.ts`: hook centralizado `useApiData<T>` con loading/error/data/refetch y protección contra race conditions
  - `components/Skeleton.tsx`: skeletons animados (`animate-pulse`) — `SkeletonCard`, `SkeletonDashboard`, `SkeletonList`, `SkeletonGrid`
  - `components/ErrorState.tsx`: UI de error con botón "Reintentar"
  - 16 páginas migradas (dashboard + 15 bajo `/app/**`): eliminados `.catch(console.error)`, errores ahora visibles, spinners eternos imposibles
- **Fix artefactos de build Windows en Docker Linux (2026-06-13)**:
  - `npm run build` ejecutado desde Windows generó `.next/` con binarios SWC x64-Windows
  - El contenedor Docker (Linux) no podía usar esos artefactos — `next dev` crasheaba al arrancar
  - Solución: borrar `.next/` y reiniciar el contenedor desde WSL2
  - Regla establecida: nunca ejecutar `npm run build` desde Windows en proyectos que viven en Docker Linux; para verificar TypeScript sin artefactos usar `npx tsc --noEmit`
- **Fix autenticación Sanctum + MongoDB (2026-06-13)**:
  - `GET /api/auth/me` con Bearer token devolvía `{"message":"Unauthenticated."}` aunque el token existía en MongoDB
  - Causa raíz: Sanctum 4.x valida el ID del token con `ctype_digit()` — espera ID entero SQL; MongoDB usa IDs hexadecimales (ObjectId, 24 chars hex); `PersonalAccessToken` heredaba `$keyType = 'int'` y el guard descartaba el token antes de llegar a `findToken()`
  - Fix en `app/Models/PersonalAccessToken.php`: una línea añadida — `protected $keyType = 'string';`
  - Login funcional end-to-end verificado: `/api/auth/me` y `/api/dashboard` retornan datos reales
  - Usuario de prueba creado: `liher@tracklife.test`
- **Fix página ejercicios (2026-06-19)**:
  - `gym/ejercicios/page.tsx`: migración a `useApiData` con `api.exercises()`, filtros client-side via `useMemo` (1 sola llamada API), key bug corregido (`key={e._id ?? e.name}`), fix doble convención de músculo (dataset mezcla `lower_back` y `lower back` — filtro prueba ambas variantes), `SkeletonGrid` en carga, `ErrorState` con "Reintentar" en error
  - `gym/ejercicios/[id]/page.tsx`: migrado a `useApiData`, carga muestra `SkeletonCard`
  - TypeScript: 0 errores
- **Sprint P2 (2026-06-21)**:
  - **Form Requests**: 20 Form Requests en `app/Http/Requests/`; 12 controladores refactorizados, 0 llamadas `$request->validate()` inline
  - **Zod Frontend**: `zod@4.4.3` instalado; `lib/schemas.ts` con schemas para todos los modelos; formularios validados: login, registro, registrar comida, plan nutricional; ajuste clave Zod v4: `error:` no `errorMap:`
  - **Landing Redesign**: `src/layouts/Layout.astro` + `src/styles/global.css` creados; `astro.config.mjs` con Tailwind 4 Vite, sitemap y site URL; hero impactante, stats, features grid, steps, CTA final; meta tags OG/Twitter, canonical URL, sitemap; build: 3 páginas en 4.33s
  - **API Resources**: 8 Resources (`UserResource`, `MealResource`, `WorkoutResource`, `BiometricResource`, `ActivityResource`, `ExerciseResource`, `RecipeResource`, `WorkoutPlanResource`); todos los controladores devuelven Resources; contrato: `_id → id`, `user_id` no expuesto, fechas ISO 8601
  - **Dashboard Mejorado**: `MacroService::weeklyCalories()` (últimos 7 días); `DashboardController` con `weekly_calories` y `recent_workouts`; `components/WeeklyChart.tsx` (BarChart Recharts); `app/app/page.tsx` con streak destacado + gráfico semanal + workouts recientes; `DashboardTest.php` (5 tests TDD)
  - **Tests finales: 44/44 verdes, 170 assertions**. Build Next.js limpio.
- **Sprint P3.1 (2026-06-25)**:
  - **Tests de API (TDD)**: `WorkoutTest.php` (8 tests), `BiometricTest.php` (9 tests), `ActivityTest.php` (8 tests), `AuthTest.php` (+5 → 14 total)
  - **Suite total: 74/74 tests verdes, 274 assertions**. Sprint TEST-ONLY: cero cambios de producción, ningún bug latente
  - **Gap documentado**: `BiometricController::today()` no calcula deltas. Decisión futura: P3 vs P4

- **Sprint P3.2 (2026-06-25/07-01)**: Server Components + auth httpOnly cookie
  - `app/api/auth/{login,register,logout}/route.ts` — Route Handlers con cookie
  - `lib/server-api.ts` — capa server-only para RSC
  - Dashboard como Server Component (fetcha desde cookie)
  - Dual-write cookie+localStorage (P5.1 retirará localStorage)
  - Tests stable: 79/79 verdes
- **Sprint P3.3 (2026-06-25)**: Búsqueda real de usuarios (GET /api/users/search)
  - `UserSearchController::search()` — endpoint protegido
  - `comunidad/buscar/page.tsx` — reescrito con debounce 300ms
  - Tests: 79 verdes (309 assertions)
- **Sub-sprint perfil usuario (2026-06-29)**:
  - `app/app/comunidad/perfil/[id]/page.tsx` — página de perfil
  - `UserProfileController@show` — endpoint movido al grupo auth:sanctum
  - Tests: 84/84 verdes (318 assertions)
- **Overhaul estético "Bioluminiscencia" (2026-06-30/07-01)**:
  - Tokens OKLCH en design system (no hex)
  - Fuentes Sora+JetBrains (no Geist)
  - Componentes: Stat, Ring, Badge, EmptyState, Brand, Input
  - Dashboard: anillo de calorías + hero number
  - Login/registro con glow de marca
  - AppNav con safe-area PWA
  - Landing web1-astro rediseñada en lockstep
  - 4 skills de diseño en SDD (design-system, ui-aesthetics, motion-ux, mobile-pwa)
  - 14 páginas + 6 componentes migrados (deuda de color a 0)
  - Motion CSS puro (no framer-motion)
  - Base a11y (focus-visible, reduced-motion, ::selection)
  - Commits limpios: todos con build OK + lint 0
- **PWA instalable (2026-07-01)**:
  - `app/manifest.ts` — standalone mode, theme color
  - Iconos SVG + PNG 192/512 + maskable (`scripts/gen-icons.mjs`)
  - Service Worker (`public/sw.js`)
  - Instalable en home screen (Android/iOS)
  - Para Play Store: vía Bubblewrap (TWA)
- **Prep deploy (2026-07-01)**:
  - CORS configurable por env (`config/cors.php`)
  - `.env.production.example` (front y API)
  - `assetlinks.template.json` (para TWA)
  - Checklist exacto en [[Deploy TrackLife]]
  - Rama `master` lista para Vercel/Railway

**Pendiente:**
- Onboarding post-registro (`/onboarding`) — enlazado pero no implementado aún
- Migración SQLite → MongoDB (package instalado, config lista)
- Providers de wearables reales (Zepp, Whoop OAuth)
- Tests frontend (Vitest)
- Auth cookie-only sin localStorage (P5.1)
- Páginas con datos reales (calendario, progreso, plan nutricional, favoritos)
- Deploy público (Vercel + Railway + MongoDB Atlas) — requiere interacción usuario
- Empaquetado TWA para Play Store — tras deploy público

---

Ver también: [[API Laravel]], [[Web3 Next]], [[Web1 Astro]], [[Arquitectura Docker]], [[Deploy TrackLife]], [[Publicar TrackLife - Guia paso a paso]]
