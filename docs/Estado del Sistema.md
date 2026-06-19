# Estado del Sistema

> Generado automaticamente por `update-status.sh`. Ultima edicion manual: 2026-06-19.
> Ejecutar `make status` para actualizar los datos en tiempo real.

---

## Git

| Campo | Valor |
|-------|-------|
| Branch | `master` |
| Ultimo commit | 29d2825 — refactor: Platon is plan-only — no execution, Opus max effort |
| Remote | `https://github.com/LiherRiosRuiz/tracklife.git` (privado, configurado 2026-06-19) |
| Auto-push | Stop hook activo en `.claude/settings.json` — commit + push al finalizar cada sesion |

---

## Agentes

| Agente | Rol | Modelo | Effort | Ultima actividad |
|--------|-----|--------|--------|------------------|
| [[Liher Agente\|LIHER]] | Gobernador | sonnet-4-6 | high | (orquesta bajo demanda) |
| [[Platon SDD\|Platon]] | Pensador | opus-4-6 | max | sin sesiones |
| [[Quevedo]] | Cronista | sonnet-4-6 | high | 2026-06-07-panel-multiagente |
| [[Vinci]] | Ejecutor | sonnet-4-6 | high | (rastro en git diff) |

---

## Memoria y cronica

| Almacen | Conteo | Ubicacion |
|---------|--------|-----------|
| Sesiones Platon | 0 | `.sdd/memory/sessions/` |
| Entidades Platon | 0 | `.sdd/memory/entities/` |
| Cronicas Quevedo | 1 | `.sdd/chronicle/daily/` |

---

## Proyectos — cambios pendientes

| Proyecto | Framework | Dominio | Cambios |
|----------|-----------|---------|---------|
| [[Web1 Astro\|web1-astro]] | Astro 6 | web1.test | 5 |
| [[Web2 Nuxt\|web2-nuxt]] | Nuxt 4 | web2.test | 0 |
| [[Web3 Next\|web3-next]] | Next.js 16 | web3.test | 14 |
| [[API Laravel\|api-laravel]] | Laravel 13 | api.test | 29 |

---

## Panel tmux

El panel multi-agente (`make panel`) muestra esta misma informacion en tiempo real en terminal. Ver [[Lecciones - Panel Multiagente]] para detalles tecnicos.

---

Ver tambien: [[Home]], [[Liher Agente]], [[Platon SDD]], [[Quevedo]], [[Vinci]], [[Pendientes]]
