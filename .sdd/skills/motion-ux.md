# Skill: Motion & Micro-interacciones

Motion que da vida sin coste de performance. Stack: Framer Motion + View Transitions API. Aplica a `web3-next` y `web1-astro`.

## Principios
1. **Propósito > decoración**: cada animación comunica (entrada, cambio de estado, éxito). Si no comunica, fuera.
2. **Rápido y físico**: duraciones 150–300ms para UI; easing tipo `ease-out` para entradas, `spring` para elementos "vivos" (anillos, sheets).
3. **Solo `transform` y `opacity`**: animar `width/height/top/left` causa layout thrash y jank. Para layout, usar `layout` de Framer Motion (FLIP).

## Patrones
- **Entrada escalonada** (listas, grids): `staggerChildren` 40–60ms. Da sensación de orquestación.
- **Transición de ruta**: View Transitions API (Astro nativo; Next con `next-view-transitions` o la API del navegador) para continuidad entre pantallas.
- **Anillos animados**: animar `strokeDashoffset` de 0 → valor al montar (el Ring "se llena").
- **Celebración de logros**: al cerrar workout / completar racha → confetti + `shadow-glow` pulsante + `navigator.vibrate(...)` (haptic). Es el momento de retención.
- **Feedback táctil**: `whileTap={{ scale: 0.97 }}` en botones primarios.

## Accesibilidad (obligatorio)
- Respetar `prefers-reduced-motion`: con la media activa, animaciones a duración ~0 (solo opacidad o nada). Framer: `useReducedMotion()`.
- Nunca bloquear interacción esperando una animación.

## Performance
- `will-change` con moderación (solo durante la animación).
- Presupuesto: las animaciones no deben bajar el frame rate de 60fps en perfil throttled.
- Lazy-load de confetti / efectos pesados.

## Cuándo NO animar
Datos críticos que el usuario lee rápido durante ejercicio (números, timers): que aparezcan instantáneos. Reservar el deleite para transiciones y logros.

Ver también: [[design-system]], [[ui-aesthetics]], [[nextjs-16]].
