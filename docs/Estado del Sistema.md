# Estado del Sistema

> Generado automaticamente por `update-status.sh`. Ultima edicion manual: 2026-07-01.
> Ejecutar `make status` para actualizar los datos en tiempo real.

---

## Git

| Campo | Valor |
|-------|-------|
| Branch | `master` — rama de producción |
| Ultimo commit | `e572de5` — Merge overhaul estético → master (2026-07-01) |
| Remote | `https://github.com/LiherRiosRuiz/tracklife.git` (privado, configurado 2026-06-19) |
| Auto-push | Stop hook activo en `.claude/settings.json` — commit + push al finalizar cada sesion |
| Estado | Overhaul (F1–F5) mergeado, PWA lista, prep deploy completa. Listo para Vercel/Railway/MongoDB Atlas. |

---

## Agentes

| Agente | Rol | Modelo | Effort | Ultima actividad |
|--------|-----|--------|--------|------------------|
| [[Liher Agente\|LIHER]] | Gobernador | sonnet-4-6 | high | (orquesta bajo demanda) |
| [[Platon SDD\|Platon]] | Pensador | opus-4-6 | max | sin sesiones |
| [[Quevedo]] | Cronista | sonnet-4-6 | high | 2026-06-21 |
| [[Vinci]] | Ejecutor | sonnet-4-6 | high | (rastro en git diff) |

---

## Memoria y cronica

| Almacen | Conteo | Ubicacion |
|---------|--------|-----------|
| Sesiones Platon | 0 | `.sdd/memory/sessions/` |
| Entidades Platon | 0 | `.sdd/memory/entities/` |
| Cronicas Quevedo | 8 | `.sdd/chronicle/daily/` |

---

## Proyectos — cambios pendientes

| Proyecto | Framework | Dominio | Ultima actividad |
|----------|-----------|---------|-----------------|
| [[Web1 Astro\|web1-astro]] | Astro 6 | www.tracklife.test | Landing rediseñada "Bioluminiscencia" lockstep (2026-07-01) · corriendo OK |
| [[Web2 Nuxt\|web2-nuxt]] | Nuxt 4 | web2.test | sin cambios recientes |
| [[Web3 Next\|web3-next]] | Next.js 16 | app.tracklife.test | Overhaul completo: design system OKLCH, dashboard, onboarding, PWA (2026-07-01) |
| [[API Laravel\|api-laravel]] | Laravel 13 | api.tracklife.test | Fix aislamiento tests + endpoint perfil + CORS por env (2026-06-29/07-01) |

---

## Panel tmux

El panel multi-agente (`make panel`) muestra esta misma informacion en tiempo real en terminal. Ver [[Lecciones - Panel Multiagente]] para detalles tecnicos.

---

Ver tambien: [[Home]], [[Liher Agente]], [[Platon SDD]], [[Quevedo]], [[Vinci]], [[Pendientes]]
