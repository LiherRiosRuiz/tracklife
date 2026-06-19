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

## Design System

**Paleta de colores** (tema oscuro):

| Variable | Valor | Uso |
|----------|-------|-----|
| `--background` | `#0b1210` | Fondo de página |
| `--foreground` | `#f0fdf4` | Texto principal |
| `--card` | `#111916` | Cards y sidebar |
| `--accent` | `#22c55e` | Acciones, activo, TRACKLIFE brand |
| `--accent-dim` | `#166534` | Fondo de elemento activo en nav |
| `--muted` | `#94a3b8` | Texto secundario |
| `--border` | `#1e293b` | Bordes |

**Tipografía**: Geist Sans + Geist Mono (Google Fonts)

**Componentes en `components/ui.tsx`**:
- `<Card>` — contenedor con bordes redondeados (rounded-2xl)
- `<Button>` — tres variantes: primary (verde), secondary (borde), ghost
- `<PageHeader>` — título + subtítulo de sección
- `<MacroBar>` — barra de progreso con valor/objetivo
- `<ScoreBadge>` — badge de puntuación coloreado (verde/amarillo/rojo)

**Iconos**: lucide-react

**Gráficos**: recharts (para biométricos)

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

**Pendiente:**
- Migración SQLite → MongoDB cablear en API (package instalado, `DB_CONNECTION=mongodb` ya configurado)
- PWA / app móvil nativa
- Providers de wearables reales (Zepp, Whoop OAuth)
- Páginas calendario (con datos reales) y progreso (con gráficos recharts)
- Páginas nutrición/plan, nutrición/favoritos, comunidad/buscar (placeholders)
- Tests frontend (Vitest)
- SSL para dominios tracklife en producción

---

Ver también: [[API Laravel]], [[Web3 Next]], [[Web1 Astro]], [[Arquitectura Docker]]
