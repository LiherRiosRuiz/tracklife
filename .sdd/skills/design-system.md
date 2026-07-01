# Skill: Design System — "Bioluminiscencia" (TrackLife)

Fuente de verdad visual del workspace. Aplica a `web3-next` (app) y `web1-astro` (landing), que comparten tokens en lockstep.

Implementación viva: `projects/web/web3-next/app/globals.css` (`@theme`).

## Principio

Dark profundo verde-petróleo donde **los datos brillan**. El accent lima es energía y lectura rápida (ejercicio); los acentos secundarios (cian/violeta/ámbar/coral) dan color a la data-viz multivariable. Evolución de la identidad existente, no ruptura.

## Tokens (Tailwind 4 `@theme`, OKLCH)

OKLCH porque es perceptualmente uniforme: cambiar lightness no desplaza el tono, y el chroma es predecible. Tailwind 4 lo soporta nativo y genera utilidades (`bg-accent`, `text-fg-muted`, `border-border`, …).

### Superficies
- `--color-bg` `oklch(16% 0.018 165)` — fondo casi-negro, tinte frío.
- `--color-surface` `oklch(20% …)` — card base · `--color-surface-2` `oklch(24% …)` — elevada/hover.
- `--color-border` `oklch(28% …)` · `--color-border-strong` `oklch(36% …)` — hairlines.

### Texto
- `--color-fg` `oklch(97% 0.012 150)` — principal · `--color-fg-muted` `oklch(72% …)` — secundario (NO slate frío) · `--color-fg-subtle` `oklch(58% …)` — terciario/placeholders.

### Marca
- `--color-accent` `oklch(82% 0.21 142)` — lima (CTA, énfasis) · `--color-accent-strong` (hover) · `--color-accent-dim` (fondos sutiles, nav activo) · `--color-on-accent` (texto sobre accent).

### Data-viz secundaria
- `--color-cyan` (210) · `--color-violet` (295) · `--color-amber` (75) · `--color-coral` (25).

### Semánticos
- Estado: `--color-success` / `--color-warning` / `--color-danger`.
- Dominio (macros): `--color-protein` = cyan · `--color-carbs` = amber · `--color-fat` = coral. **Nunca** hardcodear `bg-blue-500` para una macro: usar `bg-protein`.

### Alias legacy
`--color-background/foreground/card/muted` apuntan a los nuevos. Permiten que las ~40 páginas existentes sigan funcionando durante la migración. Migrar progresivamente a los nombres nuevos (`bg-surface`, `text-fg-muted`).

## Escala, radii, elevación
- Tipo: `--text-xs…5xl` (ratio ~1.25). Hero numbers en `text-4xl/5xl` `font-extrabold`.
- Radii: card `--radius-2xl`, botón `--radius-lg`, input `--radius-md`. Coherencia obligatoria.
- Sombras: `--shadow-sm/md/lg` suaves + `--shadow-glow` (halo lima) reservado a CTAs/logros.

## Reglas duras
1. **Contraste**: el accent lima NO se usa para texto pequeño de párrafo (usar `--color-fg`). fg/bg ≈ 17:1 (AAA).
2. **Tabular nums**: toda métrica numérica lleva `.tabular` o `tabular-nums` (los dígitos no "bailan").
3. **Cero emojis literales** como iconografía (🔥🥗🏋️): usar `lucide-react` con `strokeWidth={1.75}` coloreado con tokens.
4. **Un solo sitio para cambiar identidad**: si quieres re-tematizar, editas `@theme` en `globals.css`, no N componentes.
5. **Lockstep landing**: `web1-astro` sincroniza los mismos valores en su `global.css`.

Ver también: [[ui-aesthetics]], [[motion-ux]], [[mobile-pwa]], [[tailwind-4]].
