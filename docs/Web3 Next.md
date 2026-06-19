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
| tailwindcss | 4.x | Estilos utility-first |
| lucide-react | 0.511.0 | Iconos |
| recharts | 2.15.3 | Gráficos biométricos |
| html5-qrcode | 2.3.8 | Escáner de código de barras |
| typescript | 5.x | Tipos |
| eslint | 9.x + eslint-config-next | Linting |

---

## Arquitectura de rutas (App Router)

```
app/
├── layout.tsx              Root layout: AuthProvider + Geist fonts
├── globals.css             Tema dark + @theme Tailwind 4
├── page.tsx                / → redirect a /app o /login
│
├── login/page.tsx          Formulario de login
├── registro/page.tsx       Formulario de registro
├── explorar/page.tsx       Explorar público (sin auth)
│
└── app/                    App autenticada (AuthGuard + AppNav)
    ├── layout.tsx          Layout: AuthGuard + AppNav + main container
    ├── page.tsx            Dashboard principal
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
    │   └── buscar/         Buscar usuarios (placeholder)
    │
    ├── coach/
    │   ├── page.tsx        Insights diarios del coach
    │   ├── plan/           Plan del coach (placeholder)
    │   └── insights/       Historial de insights (placeholder)
    │
    ├── perfil/page.tsx     Perfil del usuario
    ├── objetivo/page.tsx   Objetivo de transformación
    └── ajustes/page.tsx    Configuración de la cuenta
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
Sistema de diseño básico:
- `Card` — contenedor `rounded-2xl border bg-card`
- `Button` — primario (verde), secundario (borde), ghost. Acepta `href` para renderizar como `<Link>`
- `PageHeader` — `<h1>` + subtítulo opcional
- `MacroBar` — barra de progreso `value/target` con porcentaje calculado
- `ScoreBadge` — badge coloreado: verde (≥70), amarillo (≥40), rojo (<40)

---

## Dashboard (`/app/page.tsx`)

Página principal post-login. Llama a `api.dashboard(token)` y muestra:
1. **Racha**: días consecutivos con icono Flame
2. **Card "Hoy"**: barras de macros (cal, proteína, carbos, grasas) + botones Registrar/Escanear
3. **Card "Coach"**: mensajes de insights del día
4. **Feed preview**: últimos 5 posts de la comunidad

---

## Design tokens (globals.css + Tailwind 4)

```css
@import "tailwindcss";

:root {
  --background: #0b1210;   /* Verde oscuro casi negro */
  --foreground: #f0fdf4;   /* Blanco verdoso */
  --card:       #111916;   /* Fondo de cards */
  --accent:     #22c55e;   /* Verde principal (brand) */
  --accent-dim: #166534;   /* Verde oscuro (activo) */
  --muted:      #94a3b8;   /* Gris azulado (texto secundario) */
  --border:     #1e293b;   /* Gris oscuro (bordes) */
}

@theme inline {
  /* Expone CSS vars como clases Tailwind: bg-accent, text-muted, etc. */
}
```

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

Ver también: [[TRACKLIFE]], [[API Laravel]], [[Arquitectura Docker]]
