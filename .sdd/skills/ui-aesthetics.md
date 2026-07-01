# Skill: UI Aesthetics — Premium Consumer

Principios para que TrackLife se sienta producto premium, no "dashboard de admin". Aplica a `web3-next` y `web1-astro`. Referencias: Whoop, Strava, Apple Fitness, Gentler Streak, Linear, Arc.

## 1. Jerarquía: el "hero number"
Cada pantalla tiene UNA métrica protagonista, grande, con `tabular-nums`, acompañada de un label pequeño en `text-fg-subtle`. El resto se subordina. Sin jerarquía → todo pesa igual → ruido. Primitivo: `Stat` (`components/ui.tsx`).

## 2. La firma: anillos de progreso
Los `Ring` (SVG circular, estilo Apple/Whoop) son el elemento memorable. Glow sutil (`drop-shadow` del color del trazo) = "bioluminiscencia". Úsalos para el dato central (calorías, recovery, anillos de actividad). No abusar: 1-2 por pantalla.

## 3. Densidad por contexto
- **Aireada** (dashboards, resúmenes): cards espaciadas, respiración.
- **Compacta** (listas de sets, historial, tablas): filas densas con `divide-y divide-border`.
Elegir según la tarea, no aplicar la misma densidad a todo.

## 4. Elevación con propósito
`shadow-md` solo en superficies que "flotan" (hero card, sheets, modales). El glow (`shadow-glow`) se reserva a momentos de energía: CTA principal, celebración de logro. Escaso = premium; omnipresente = barato.

## 5. Gradientes y color con mesura
Gradiente de marca (`accent → cyan`) solo en momentos clave (logo, hero de landing, celebración). El color secundario (cyan/violet/amber/coral) se gana su sitio en data-viz; fuera de ahí, predominan superficies neutras + un acento.

## 6. Componentes con personalidad
- `EmptyState`: nunca texto gris suelto. Icono lucide + título + mensaje con tono + CTA.
- `Badge`/`ScoreBadge`: estados con tokens semánticos, no utilidades sueltas.
- Skeletons: shimmer de marca, no cajas grises planas.

## 7. Data-viz fitness
- Barras de macro coloreadas por token semántico (`bg-protein/carbs/fat`).
- Sparklines para tendencias (peso, HRV) — minimalistas, sin ejes ruidosos.
- Anillos para progreso vs objetivo. Recharts/visx para series; estilizar al token, no dejar defaults.

## Checklist "¿esto parece producto?"
- [ ] ¿Hay un hero number claro por pantalla?
- [ ] ¿Cero emojis literales como iconos?
- [ ] ¿Métricas con `tabular-nums`?
- [ ] ¿Radii y sombras consistentes (tokens)?
- [ ] ¿El color secundario solo aparece donde aporta significado?
- [ ] ¿Los estados vacíos tienen personalidad?

Ver también: [[design-system]], [[motion-ux]], [[react-19]].
