# Web3 Next — TRACKLIFE App

Aplicación principal de TRACKLIFE. Next.js 16 + React 19 + Tailwind 4.

- **Dominio**: `http://app.tracklife.test` (y `http://tracklife.test`)
- **Puerto interno**: 3000
- **Contenedor**: `tracklife`
- **Ruta**: `projects/web/web3-next/`

---

## Stack técnico

| Paquete | Versión | Uso |
|---------|---------|-----|
| next | 16.2.7 | Framework SSR |
| react | 19.2.4 | UI |
| react-dom | 19.2.4 | DOM rendering |
| tailwindcss | 4.x | Estilos utility-first (tokens OKLCH, no hex) |
| lucide-react | 0.511.0 | Iconos |
| recharts | 2.15.3 | Gráficos biométricos |
| html5-qrcode | 2.3.8 | Escáner de código de barras |
| typescript | 5.x | Tipos |
| eslint | 9.x + eslint-config-next | Linting |
| zod | 4.4.3 | Validación de esquemas (frontend + backend) |

---

## Arquitectura de rutas (App Router)

```
app/
├── layout.tsx              Root layout: AuthProvider + Sora/JetBrains fonts
├── globals.css             Tema dark + design system Bioluminiscencia (tokens OKLCH)
├── page.tsx                / → redirect a /app o /login
├── manifest.ts             PWA manifest (standalone mode, theme color)
│
├── login/page.tsx          Formulario de login (glow de marca, Input nuevo)
├── registro/page.tsx       Formulario de registro (redirecciona a /onboarding)
├── explorar/page.tsx       Explorar público (sin auth)
│
├── onboarding/             Flujo post-registro (bienvenida → objetivo → macros → listo)
│   └── page.tsx            ⚠ Ruta enlazada pero no implementada aún
│
└── app/                    App autenticada (AuthGuard + AppNav)
    ├── layout.tsx          Layout: AuthGuard + AppNav + safe-area (PWA) + main container
    ├── page.tsx            Dashboard principal (Server Component, anillo de calorías + hero number)
    ├── loading.tsx         RSC loading boundary
    ├── error.tsx           RSC error boundary
    │
    ├── nutricion/
    │   ├── page.tsx        Hub de nutrición (grid de accesos)
    │   ├── diario/         Diario de comidas del día
    │   ├── registrar/      Registrar nueva comida
    │   ├── escaner/        Escáner de código de barras
    │   ├── macros/         Objetivos y progreso de macros
    │   ├── plan/           Plan semanal (placeholder)
    │   ├── recetas/        Biblioteca de recetas
    │   └── favoritos/      Alimentos favoritos (placeholder)
    │
    ├── entrenamiento/
    │   ├── page.tsx        Hub de entrenamiento
    │   ├── gym/            Log de gym
    │   │   └── ejercicios/ Catálogo de ejercicios
    │   ├── cardio/         Registro de actividad cardio
    │   ├── calendario/     Historial (placeholder)
    │   └── progreso/       Gráficos de progreso (placeholder)
    │
    ├── biometricos/
    │   ├── page.tsx        Hub de biométricos
    │   ├── hoy/            Resumen biométrico de hoy
    │   ├── corazon/        HRV + FC reposo
    │   ├── cuerpo/         Peso + grasa corporal
    │   ├── sueno/          Sleep score
    │   ├── hrv/            Histórico de HRV
    │   └── dispositivos/   Gestión de wearables conectados
    │
    ├── comunidad/
    │   ├── page.tsx        Feed social
    │   ├── retos/          Lista de retos
    │   ├── clubs/          Lista de clubs
    │   ├── buscar/         Buscar usuarios (endpoint real)
    │   └── perfil/[id]/    Perfil de usuario (página y endpoint protegido)
    │
    ├── coach/
    │   ├── page.tsx        Insights diarios del coach
    │   ├── plan/           Plan del coach (placeholder)
    │   └── insights/       Historial de insights (placeholder)
    │
    ├── perfil/page.tsx     Perfil del usuario
    ├── objetivo/page.tsx   Objetivo de transformación
    └── ajustes/page.tsx    Configuración de la cuenta

API routes (autenticación server-side):
├── api/auth/
│   ├── login/route.ts      POST: httpOnly cookie + bearer token
│   ├── register/route.ts   POST: crea usuario + httpOnly cookie
│   └── logout/route.ts     POST: limpia cookie
```

---

## Componentes

### `lib/api.ts`
Cliente HTTP tipado que envuelve todas las llamadas a la API.

- URL base: `NEXT_PUBLIC_API_URL` (default: `http://api.tracklife.test`)
- Función `request<T>(path, options, token?)` — envía `Authorization: Bearer` si token
- **AbortController con timeout 10s** — si la API no responde, lanza error legible en lugar de colgar
- Lanza `Error` con el mensaje del servidor si la respuesta no es OK

**Tipos exportados**: `User`, `MacroTargets`, `MacroProgress`, `FeedPost`, `MealEntry`, `FoodItem`, `Product`, `Recipe`, `Challenge`, `Club`, `Workout`, `Exercise`, `Activity`, `BiometricReading`, `WearableConnection`

**Métodos del objeto `api`**:
```
auth:       register, login, me
dashboard:  dashboard
nutrición:  macroProgress, updateMacroTargets, meals, createMeal,
            searchFoods, productByBarcode, scanProduct, recipes
social:     feed, kudos, comment, challenges, joinChallenge, clubs, joinClub
entreno:    workouts, createWorkout, exercises, activities, createActivity
biométrica: biometricsToday, biometrics, createBiometric
wearables:  wearables, connectWearable, syncWearable
coach:      coachDaily
perfil:     updateProfile
```

### `lib/auth.tsx`
Context de autenticación (`"use client"`).

- `AuthProvider`: gestiona user/token/loading, persiste token en localStorage (`tracklife_token`)
- `useAuth()`: hook que devuelve `{user, token, loading, login, register, logout}`
- Al montar: intenta recuperar sesión desde localStorage via `api.me(token)`

### `components/AppNav.tsx`
Navegación principal (`"use client"`).

- **Header sticky**: logo TRACKLIFE + nombre de usuario + botón logout
- **Bottom nav** (mobile): 6 tabs — Inicio, Nutrición, Entreno, Biométricos, Comunidad, Coach
- **Sidebar** (desktop ≥ md): mismo 6 links, versión vertical con iconos

Secciones del nav:
| Href | Label | Icono |
|------|-------|-------|
| /app | Inicio | Home |
| /app/nutricion | Nutrición | Apple |
| /app/entrenamiento | Entreno | Dumbbell |
| /app/biometricos | Biométricos | Heart |
| /app/comunidad | Comunidad | Users |
| /app/coach | Coach | Activity |

### `hooks/use-api-data.ts`
Hook centralizado para fetch de datos (`"use client"`).

- `useApiData<T>(fetcher, deps, options?)` → `{ data, loading, error, refetch }`
- Gestiona loading/error/data de forma consistente en todas las páginas
- Opción `enabled` para evitar fetch cuando token aún no está disponible
- Protección contra race conditions vía `fetchCountRef` (soporta re-renders, Strict Mode, desmontaje)

### `components/Skeleton.tsx`
Skeletons de carga con `animate-pulse` de Tailwind.

- `Skeleton` — bloque base configurable via `className`
- `SkeletonCard` — simula una `Card` con 3 líneas de texto
- `SkeletonDashboard` — skeleton dedicado para el dashboard (macros + card)
- `SkeletonList` — N tarjetas en columna
- `SkeletonGrid` — N tarjetas en grid

### `components/ErrorState.tsx`
Estado de error con botón "Reintentar". Recibe `message` y `onRetry?`.

### `components/AuthGuard.tsx`
Wrapper que redirige a `/login` si el usuario no está autenticado. Muestra spinner mientras `loading=true`.

### `components/BarcodeScanner.tsx`
Wrapper de `html5-qrcode`. Activa la cámara del dispositivo para leer códigos de barras. Usado en `/app/nutricion/escaner`.

### `components/FeedList.tsx`
Lista de posts del feed social con soporte de kudos y comentarios.

### `components/ui.tsx`
Sistema de diseño **Bioluminiscencia** (tokens OKLCH, no emojis, colores accesibles):
- `Brand` — wordmark TRACKLIFE con gradiente accent→cyan
- `Input` — campo de formulario con borde y estado de error (error: danger)
- `Card` — contenedor `rounded-2xl border bg-surface` (puede elevar con `elevated`)
- `Button` — primario (accent), secundario (border), ghost. Acepta `href` para renderizar como `<Link>`
- `PageHeader` — `<h1>` + subtítulo opcional
- `Stat` — métrica: label pequeño + número héroe tabulado (para biométricos y macros)
- `Ring` — anillo de progreso circular (firma visual estilo Apple/Whoop)
- `Badge` — insignia con estado (success/warning/danger) sin emoji
- `MacroBar` — barra de progreso `value/target` con porcentaje calculado
- `ScoreBadge` — badge coloreado por score: verde (≥70), amarillo (≥40), rojo (<40)
- `EmptyState` — estado vacío con ícono y CTA

---

## Dashboard (`/app/page.tsx`)

**Server Component** (fetcha datos server-side desde la cookie de sesión). Llama a `serverApi.dashboard()` y muestra:

1. **Anillo de calorías**: Ring component circular con progreso calórico (firma visual)
2. **Hero number**: calorías consumidas hoy en texto grande tabulado
3. **Racha**: días consecutivos con glow de accent
4. **Card "Hoy"**: barras de macros (protein/carbs/fat) codificadas por color dominio (cyan/amber/coral)
5. **Client island "Gráfico semanal"**: `WeeklyChart` (Recharts BarChart, últimos 7 días)
6. **Card "Coach"**: mensajes de insights del día
7. **Feed preview**: últimos 5 posts de la comunidad (datos desde API)

**Nota de arq:** dashboard usa server-side fetching vía cookie httpOnly (seguro). `WeeklyChart` es client component para interactividad. Esto desbloquea migraciones futuras a RSC (P5.1).

---

## Design System "Bioluminiscencia" (F1–F5, overhaul 2026-06-30/07-01)

### Tokens (globals.css + Tailwind 4)

**Superficies y texto** (valores OKLCH):
- `--color-bg` `oklch(16% 0.018 165)` — fondo page oscuro, verde-petróleo
- `--color-surface` `oklch(20% 0.020 165)` — cards y componentes
- `--color-surface-2` `oklch(24% 0.022 165)` — superficies elevadas
- `--color-border` `oklch(28% 0.020 165)` — bordes estándar
- `--color-border-strong` `oklch(36% 0.022 165)` — bordes activos
- `--color-fg` `oklch(97% 0.012 150)` — texto principal (blanco verdoso)
- `--color-fg-muted` `oklch(72% 0.018 160)` — texto secundario
- `--color-fg-subtle` `oklch(58% 0.016 160)` — hints y placeholders

**Marca y acentos** (lima electrico + secundarios):
- `--color-accent` `oklch(82% 0.21 142)` — verde lima principal
- `--color-accent-strong` `oklch(74% 0.20 142)` — hover/activo
- `--color-accent-dim` `oklch(38% 0.09 142)` — fondo de elemento activo
- `--color-on-accent` `oklch(18% 0.03 150)` — texto sobre accent
- `--color-cyan`, `--color-violet`, `--color-amber`, `--color-coral` — data-viz y firma

**Semánticos** (estado + macros):
- `--color-success`, `--color-warning`, `--color-danger` — feedback
- `--color-protein` (cyan), `--color-carbs` (amber), `--color-fat` (coral)

**Legacy aliases** (compat con ~40 páginas existentes):
- `--color-background`, `--color-card`, `--color-foreground`, `--color-muted` → OKLCH nuevos

**Radii**: `--radius-sm` (0.5rem) a `--radius-2xl` (1.5rem)

**Tipografía modular** (ratio 1.25): `--text-xs` (0.75rem) a `--text-5xl` (3.5rem)

**Elevación**: sombras suaves (`--shadow-sm/md/lg`) + glow de accent (`--shadow-glow`)

**Fuentes** (no Geist):
- `--font-sans`: **Sora** (display, Google Fonts, pesos 400/500/700)
- `--font-mono`: **JetBrains Mono** (datos, tabular-nums activado, monoespaciado)

**Motion CSS** (sin framer-motion):
- `@keyframes ring-fill` — anillo de progreso (firma visual)
- `@keyframes fade-in-up` — fade in suave
- `.animate-ring`, `.animate-in` — clases de animación
- Respeta `prefers-reduced-motion` (a11y)

---

## Configuración

**`next.config.ts`**:
```ts
allowedDevOrigins: ["app.tracklife.test", "tracklife.test"]
```

**`docker-compose.yml`**:
- Contenedor: `tracklife`
- Env: `NEXT_PUBLIC_API_URL=http://api.tracklife.test`
- Volumen: `tracklife_node_modules` para `/app/node_modules`
- Traefik labels: `Host(app.tracklife.test) || Host(tracklife.test)`

**`eslint.config.mjs`**: ESLint 9 flat config con `core-web-vitals` + TypeScript.

---

## Comandos

```bash
make web3-up          # Desde LIHER/ — levanta en Docker (rebuild)
make tracklife-up     # Alias de web3-up
npm run dev           # Dev server local
npm run build         # Build de producción (NO ejecutar desde Windows — genera .next/ con binarios x64-Windows incompatibles con Docker Linux)
npm run lint          # ESLint
npx tsc --noEmit      # Verificar tipos sin generar artefactos (alternativa segura desde Windows)
```

---

## PWA (Progressive Web App)

**Manifest** (`app/manifest.ts`):
- Nombre y ícono (lima accent)
- Modo `standalone` (sin barra del navegador)
- Theme color: `var(--color-accent)`
- Display y orientación configuradas

**Iconos** (`public/icons/` + `scripts/gen-icons.mjs`):
- SVG escalable
- PNG 192x192 y 512x512 (para home screen)
- PNG maskable 512x512 (para temas de SO, rounded by default)

**Service Worker** (`public/sw.js`):
- Precarga assets críticos (estáticos)
- Funciona offline en modo básico

**Instalación**:
- Web3 Next sirve el manifest
- Navegadores detectan installability automáticamente
- "Instalar en pantalla principal" en Android/iOS

**Para Play Store**: vía Bubblewrap (TWA), genera APK/AAB desde el PWA manifest. Ver [[Deploy TrackLife]].

---

## Autenticación (P3.2 — httpOnly cookie)

**Flujo**:
1. **POST /api/auth/register** vía Route Handler (`app/api/auth/register/route.ts`)
   - Recibe name/email/password de form
   - Proxea al API Laravel (server-to-server, sin CORS via `API_INTERNAL_URL`)
   - Laravel retorna token Sanctum + user
   - Route Handler setea cookie httpOnly (`tracklife_session`)
   - Responde con user JSON + Set-Cookie header
2. **POST /api/auth/login** — mismo flujo
3. **POST /api/auth/logout** — limpia cookie
4. **GET /app** (Server Component) — verifica cookie, fetcha via `serverApi.dashboard()`

**Seguridad**:
- Cookie: `HttpOnly=true`, `SameSite=Lax`, `Path=/`, `Secure` en producción
- Dual-write: cookie + localStorage para compatibilidad con 18 páginas client (P5.1 retirará localStorage)
- `API_INTERNAL_URL` nunca expuesto al navegador (server-only)

---

Ver también: [[TRACKLIFE]], [[API Laravel]], [[Arquitectura Docker]], [[Deploy TrackLife]]
