# Design System — "Bioluminiscencia"

Fuente de verdad visual de TrackLife. Referenciado directamente desde los comentarios de
`web3-next/app/globals.css` y `web1-astro/src/styles/global.css`. Cualquier cambio de
paleta, tipografía, sombra o motion debe actualizarse aquí en el mismo PR.

## 1. Filosofía: instrumento vs. marketing

TrackLife tiene dos caras con propósitos distintos, y el sistema visual las trata de forma
deliberadamente distinta:

- **`web3-next` (la app) = instrumento de precisión, estilo Tesla.** El usuario ya está
  dentro, mirando sus datos varias veces al día. Aquí el diseño se aparta: superficies
  casi-monocromas, bordes tipo hairline, un único acento (lima) reservado para señalar lo
  importante, tipografía tabular para que los números no "bailen". Cero saturación
  decorativa — cada pixel de color debe significar algo (progreso, estado, marca).
- **`web1-astro` (la landing) = momento de conversión, energía La Velada del Año.** El
  visitante todavía no es usuario; el hero, el CTA final y la franja de stats tienen que
  vender la promesa con impacto visual — gradientes, glow, tipografía display, motion sutil.

La regla de oro: **restraint es el default, energy es la excepción explícita y
geográficamente confinada** (ver §3). Ningún screen de `web3-next/app/**` debe verse "hype";
ninguna sección fuera de hero/CTA/stats de la landing debe verse "hype" tampoco.

## 2. Token reference

Fuente canónica: `web3-next/app/globals.css` (`@theme`). `web1-astro/src/styles/global.css`
sincroniza el set completo (ver §6). Todos los valores están en OKLCH (`L% C H`).

### 2.1 Superficies

| Token | Valor OKLCH | sRGB aprox. | Uso |
|---|---|---|---|
| `--color-bg` | `oklch(15% 0.006 165)` | `#090c0a` | Fondo base de página |
| `--color-surface` | `oklch(19% 0.007 165)` | `#111513` | Cards, paneles |
| `--color-surface-2` | `oklch(23% 0.008 165)` | `#1a1e1c` | Elementos anidados sobre `surface` |
| `--color-border` | `oklch(27% 0.006 165)` | — | Bordes hairline por defecto |
| `--color-border-strong` | `oklch(34% 0.008 165)` | — | Bordes con más énfasis |

Tinte cool `hue 165` deliberadamente conservado (no gris neutro puro) — es la firma de marca
en cada superficie, con croma muy baja (0.006–0.008) para no competir con los datos.

### 2.2 Texto

| Token | Valor OKLCH | sRGB aprox. | Uso | Contraste sobre `bg` |
|---|---|---|---|---|
| `--color-fg` | `oklch(97% 0.004 150)` | `#f3f6f4` | Texto principal | 18.04:1 |
| `--color-fg-muted` | `oklch(70% 0.008 160)` | `#9aa09d` | Texto secundario | 7.38:1 |
| `--color-fg-subtle` | `oklch(63% 0.008 160)` | `#858b87` | Labels, placeholders, hints | 5.64:1 |

`fg-subtle` fue corregido en el PR de documentación/verificación (63%, antes 55%) — ver §7.

### 2.3 Marca / accent

| Token | Valor OKLCH | sRGB aprox. | Uso |
|---|---|---|---|
| `--color-accent` | `oklch(82% 0.21 142)` | `#67e45b` | Lima — CTA primario, focus, progreso |
| `--color-accent-strong` | `oklch(74% 0.20 142)` | — | Hover/active de accent |
| `--color-accent-dim` | `oklch(38% 0.09 142)` | — | Fondo de badges tono accent |
| `--color-on-accent` | `oklch(18% 0.03 150)` | `#07150a` | Texto sobre fondo accent |

### 2.4 Acentos secundarios (data-viz)

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--color-cyan` | `oklch(80% 0.13 210)` | Gráficas, wordmark gradient |
| `--color-violet` | `oklch(72% 0.15 295)` | Gráficas |
| `--color-amber` | `oklch(80% 0.15 75)` | Gráficas, carbs |
| `--color-coral` | `oklch(72% 0.17 25)` | Gráficas, fat |

### 2.5 Semánticos de estado

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--color-success` | `oklch(80% 0.18 150)` | Confirmaciones, score alto |
| `--color-warning` | `oklch(82% 0.16 85)` | Alertas, score medio |
| `--color-danger` | `oklch(67% 0.20 25)` | Errores, score bajo |

### 2.6 Semánticos de dominio (macros)

| Token | Alias de | Uso |
|---|---|---|
| `--color-protein` | `var(--color-cyan)` | MacroBar proteína |
| `--color-carbs` | `var(--color-amber)` | MacroBar carbos |
| `--color-fat` | `var(--color-coral)` | MacroBar grasas |

### 2.7 Radios

`--radius-sm: 0.5rem` · `--radius-md: 0.75rem` · `--radius-lg: 1rem` · `--radius-xl: 1.25rem`
· `--radius-2xl: 1.5rem`

### 2.8 Escala tipográfica (ratio ~1.25, base 16px)

`--text-xs: 0.75rem` · `--text-sm: 0.875rem` · `--text-base: 1rem` · `--text-lg: 1.125rem` ·
`--text-xl: 1.25rem` · `--text-2xl: 1.5rem` · `--text-3xl: 1.875rem` · `--text-4xl: 2.5rem` ·
`--text-5xl: 3.5rem`

`--text-display: 4.5rem` existe **solo en web1-astro** (ver §3) — nunca en web3-next.

### 2.9 Sombras / elevación

`--shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.4)` · `--shadow-md: 0 4px 16px oklch(0% 0 0 / 0.45)`
· `--shadow-lg: 0 12px 32px oklch(0% 0 0 / 0.5)` ·
`--shadow-glow: 0 0 24px oklch(82% 0.21 142 / 0.25)` (glow de accent, la firma visual del Ring)

`--shadow-hype: 0 0 64px oklch(86% 0.25 140 / 0.35)` existe **solo en web1-astro** (ver §3).

### 2.10 Fuentes

`--font-sans: Sora` · `--font-mono: JetBrains Mono`. En `web3-next` se cargan vía
`next/font/google` (`app/layout.tsx`); en `web1-astro`, que no tiene `next/font`, vía
`<link>` de Google Fonts en `Layout.astro`.

## 3. La línea energy vs. restraint

Dos barreras independientes garantizan que el tratamiento "La Velada" nunca llegue a la app:

1. **Aislamiento de bundle**: los tokens `--color-energy`, `--color-energy-2`,
   `--text-display`, `--shadow-hype` y las clases `.energy*` viven **exclusivamente** en
   `web1-astro/src/styles/global.css`, dentro de un bloque marcado
   `ENERGY — La Velada, tratamiento exclusivo de landing`. No existen en el bundle
   compilado de `web3-next` (verificado por grep sobre `.next/` completo en PR4).
2. **Scope de clase `.energy`**: incluso dentro de `web1-astro`, el tratamiento intenso solo
   se activa envolviendo el bloque en `class="energy"`. Sin esa clase, `.energy-text`,
   `.energy-btn`, `.energy-glow`, `.energy-sheen` no aplican nada.

**Uso permitido**: hero, CTA final y franja de stats de `index.astro`, `precios.astro` y
`como-funciona.astro`. Nada más — nav, footer, secciones de features/steps siguen la
paleta restraint.

### Ejemplo concreto — antes/después (PR4, hero de `index.astro`)

Antes (restraint heredado, sin diferenciación de landing):

```html
<h1 class="text-5xl font-extrabold">
  Tu cuerpo. <span class="text-accent">Tus datos.</span> Tu control.
</h1>
<a href="/registro" class="bg-accent text-on-accent rounded-xl px-8 py-4">
  Empezar gratis →
</a>
```

Después (energy, confinado a `.energy` en el hero):

```html
<section class="energy energy-sheen relative overflow-hidden">
  <h1 class="text-6xl md:text-display font-extrabold tracking-tight leading-none">
    Tu cuerpo.<br />
    <span class="energy-text">Tus datos.</span><br />
    Tu control.
  </h1>
  <a href="/registro"
     class="energy-btn energy-glow rounded-xl px-8 py-4 shadow-hype">
    Empezar gratis →
  </a>
</section>
```

`energy-text` reemplaza el flat `text-accent` por un gradiente `energy → energy-2`;
`energy-btn energy-glow shadow-hype` reemplaza el botón flat `bg-accent` por gradiente +
glow pulsante. El `text-display` (4.5rem) solo se activa en breakpoints `md:` — mobile
sigue en `text-6xl` (3.5rem, misma escala que el resto del sistema).

### Ejemplo de screen que se queda en restraint

`web3-next/app/app/page.tsx` (dashboard): `Ring` con `color="var(--color-accent)"` (lima
flat, sin gradiente), `Stat` con `tabular` y sin ningún token `energy` — no existe forma de
que exista, porque esos tokens no están en su bundle.

## 4. Catálogo de primitivas (`web3-next/components/ui.tsx`)

| Primitiva | Propósito | Notas de restraint |
|---|---|---|
| `Brand` | Wordmark con gradiente accent→cyan | `tracking-tight` (no `tracking-wider`) |
| `Input` | Campo de formulario | Borde hairline `border-border`, foco `border-accent` |
| `Card` | Contenedor con borde + fondo `surface` | `elevated` añade `shadow-md` |
| `Button` | Variantes `primary` / `secondary` / `ghost` | Sin gradientes ni glow en la app |
| `PageHeader` | Título + subtítulo de página | — |
| `Stat` | Label pequeño + valor numérico grande | Valor siempre envuelto en `.tabular` |
| `Ring` | Anillo de progreso circular (SVG) | `animate-ring` respeta reduced-motion; `glow` opcional vía `drop-shadow` |
| `MacroBar` | Barra de progreso lineal (macros) | Color por defecto `bg-accent`, o semántico (`bg-protein`/`bg-carbs`/`bg-fat`) |
| `Badge` / `ScoreBadge` | Etiqueta de estado con borde hairline por tono | Score siempre en `.tabular` |
| `EmptyState` | Icono + mensaje cuando no hay datos | Icono en `text-fg-subtle` |

Todas usan solo tokens semánticos (`bg-*`, `text-*`, `border-*`, `var(--color-*)`) — cero
hex/`oklch()` embebidos, cero clases arbitrarias `bg-[...]`/`text-[...]` salvo excepciones
documentadas (§6.1).

## 5. Motion

Todo el motion del sistema es **CSS puro** — no hay librería JS de animación (framer-motion,
etc.) en ningún proyecto.

| Animación | Dónde | Definición |
|---|---|---|
| `ring-fill` | `Ring` (`.animate-ring`) | `stroke-dashoffset` desde `--ring-circ` |
| `fade-in-up` | Layout de la app (`.animate-in`) | Opacidad + `translateY(8px)` |
| `pulse-glow` | Landing, `.energy .energy-glow` | Pulso de `box-shadow` entre glow tenue y `--shadow-hype` |
| `energy-sheen` | Landing, `.energy .energy-sheen::after` | Barrido diagonal de brillo |
| `animate-pulse` (Tailwind) | Landing, punto del badge del hero (`index.astro`) | Utilidad estándar de Tailwind |
| Confetti canvas | `Celebration.tsx` | `requestAnimationFrame` (no CSS, ver abajo) |

### Reduced motion

- **`web3-next`**: reset sitewide en `@layer base` de `globals.css` — cualquier
  `animation`/`transition` en cualquier elemento se colapsa a `0.01ms` bajo
  `prefers-reduced-motion: reduce`. `Celebration.tsx` además hace un chequeo explícito en
  JS (`window.matchMedia(...)`) y **no ejecuta el canvas en absoluto** si el usuario lo
  prefiere reducido (no es solo "más rápido", es "no ocurre").
- **`web1-astro`**: mismo patrón, añadido en el PR de documentación/verificación. Antes solo
  existía un reset acotado a `.energy .energy-glow`/`.energy .energy-sheen::after`; se
  reemplazó por un reset sitewide en `@layer base` (idéntico al de `web3-next`) que además
  cubre `animate-pulse` de Tailwind — usado en el punto del badge "Plataforma fitness open
  source" del hero, que antes no tenía ningún reset de reduced-motion (gap detectado en
  verificación, ver §7).

Regla para todo desarrollo futuro: **cualquier animación CSS nueva queda cubierta
automáticamente** por el reset sitewide (usa `animation-duration`/`transition-duration`, no
selectores por clase) — no hace falta añadir una regla `prefers-reduced-motion` por cada
componente nuevo, salvo que la animación sea JS/canvas, en cuyo caso replicar el patrón de
`Celebration.tsx` (chequeo explícito de `matchMedia` antes de arrancar).

## 6. Contrato de sincronización web3 ↔ web1

`web3-next/app/globals.css` es la fuente canónica. `web1-astro/src/styles/global.css` debe
reflejar el mismo `@theme` — superficies, texto, accent, viz, semánticos de estado, macros,
radios, escala tipográfica, sombras (excepto `--shadow-hype`) y fuentes (mismo nombre
`Sora`/`JetBrains Mono`, cargados por mecanismos distintos: `next/font` vs `<link>`).

**Delta permitido en web1** (nunca al revés): el bloque `ENERGY` completo (§3) — tokens,
keyframes y clases `.energy*` — vive únicamente ahí.

Al modificar un token en `web3-next/app/globals.css`:

1. Actualizar el mismo token, con el mismo valor, en `web1-astro/src/styles/global.css`.
2. Si el token afecta contraste (color de texto/fondo), recalcular WCAG (§7) antes de mergear.
3. Actualizar esta tabla (§2) en el mismo PR.
4. Auditar que no queden alias legacy duplicados (`rg -n "oklch\(" ambos globals.css` y
   comparar).

## 7. Accesibilidad

### 7.1 Contraste WCAG AA (calculado OKLCH → sRGB lineal → luminancia relativa, sin estimar)

| Par | Ratio | Mínimo requerido | Resultado |
|---|---|---|---|
| `fg-muted` sobre `bg` | 7.38:1 | 4.5:1 (texto) | ✅ |
| `fg-muted` sobre `surface` | 6.93:1 | 4.5:1 | ✅ |
| `fg-muted` sobre `surface-2` | 6.33:1 | 4.5:1 | ✅ |
| `fg-subtle` sobre `bg` | 5.64:1 | 4.5:1 | ✅ |
| `fg-subtle` sobre `surface` | 5.29:1 | 4.5:1 | ✅ |
| `fg-subtle` sobre `surface-2` | 4.83:1 | 4.5:1 | ✅ |
| `fg` sobre `bg` / `surface` / `surface-2` | 18.04 / 16.93 / 15.47:1 | 4.5:1 | ✅ |
| `accent` sobre `bg` / `surface` | 12.04 / 11.30:1 | 3:1 (UI/large) | ✅ |
| `on-accent` sobre `accent` | 11.46:1 | 4.5:1 (texto de botón) | ✅ |
| `energy` sobre `bg` (landing) | 13.82:1 | 4.5:1 | ✅ |
| `energy-2` sobre `bg` (landing) | 12.10:1 | 4.5:1 | ✅ |
| `on-accent` sobre `energy` / `energy-2` | 13.15 / 11.51:1 | 4.5:1 | ✅ |
| `success` / `warning` / `danger` sobre `bg` | 11.24 / 11.14 / 5.98:1 | 4.5:1 | ✅ |

**Hallazgo y corrección**: la auditoría de este PR encontró que `fg-subtle` en su valor
original (`oklch(55% 0.008 160)`) daba **4.07:1 sobre `bg`** — por debajo del mínimo 4.5:1
para texto normal. Se usa en la práctica en `text-xs`/`text-sm` (label de `Stat`, labels de
formulario en onboarding, nav de `AppNav`), tamaños que no califican como "large text" bajo
WCAG (requeriría ≥18px normal o ≥14px bold). Se corrigió a `oklch(63% 0.008 160)` en ambos
`global.css` (web3 canónico + sync de web1), manteniendo croma/hue — ver tabla arriba para
los nuevos ratios, todos ≥4.5:1 incluso contra `surface-2` (el peor caso).

Nota sobre bordes: `border`/`border-strong` tienen contraste bajo (~1.2–1.4:1) contra los
fondos por diseño — son hairlines decorativos, no el único medio de identificar los límites
de un control (`Input` tiene padding, placeholder y un anillo de foco de 2px en `accent` que
sí supera 3:1 al enfocarse). No se tocan; es una elección de restraint deliberada, no un
fallo de accesibilidad.

### 7.2 Reduced motion

Ver §5 — reset sitewide en ambos proyectos, más chequeo explícito en JS para `Celebration.tsx`.

### 7.3 Foco visible

`@layer base` en `web3-next/app/globals.css` define `:focus-visible` con `outline: 2px solid
var(--color-accent)` y `::selection` con fondo `accent`/texto `on-accent`. `web1-astro` no
replica estas dos reglas (fuera del alcance de este PR — solo se decidió backportear
específicamente el reset de `prefers-reduced-motion`, que era el gap señalado). El foco por
defecto del navegador sigue siendo visible en la landing; se recomienda evaluar el backport
de `:focus-visible`/`::selection` en un PR futuro si se detectan problemas de accesibilidad
de teclado en la landing.

### 7.4 Números tabulares

Cualquier valor numérico de métrica (Stat, ScoreBadge, MacroBar, Ring) usa `.tabular`
(`font-variant-numeric: tabular-nums`) para que los dígitos no cambien de ancho al animar o
actualizar — evita "salto" visual, relevante tanto para legibilidad como para no depender
de percepción de movimiento para seguir el valor.
