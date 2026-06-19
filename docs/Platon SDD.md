# Platón SDD — ΠΛΑΤΏΝ v2.0

Framework Spec-Driven Development del workspace LIHER. Nombrado por la Alegoría de la Caverna: ver con claridad antes de construir.

- **Lanzador**: `bash platon.sh` desde `LIHER/`
- **CLI**: `.sdd/cli/platon.mjs` (Node.js, sin banner de Claude Code)
- **Versión**: 2.0 — Memoria persistente + Skills + Delegación + Guardian Angel
- **Inspiraciones**: Engram (memoria), gentle-ai (delegación + fases), Gentleman-Skills (skills), Guardian Angel (pre-commit)

---

## Filosofía

```
Platón (Opus 4.6, max effort)    Claude Code (Sonnet 4.6, normal)
        PLANIFICA                          EJECUTA
           ↓                                 ↑
        /delegate ─────── plan estructurado ──┘
```

Platón no ejecuta ni escribe código. Solo analiza, razona y produce planes que Claude Code puede implementar directamente.

---

## Estructura de archivos

```
.sdd/
├── config.yaml              # Configuración del workspace (v2.0)
├── skills.yaml              # Índice de registries y skills (v2.1)
├── platon-prompt.md         # System prompt del agente planificador
│
├── cli/
│   ├── platon.mjs           # CLI principal (Node.js ESM)
│   └── package.json         # Deps: @anthropic-ai/claude-agent-sdk
│
├── registries/              # Skills específicas por proyecto
│   ├── web1-astro.yaml
│   ├── web2-nuxt.yaml
│   ├── web3-next.yaml
│   └── api-laravel.yaml
│
├── skills/                  # Patrones del stack (SKILL.md format)
│   ├── react-19.md
│   ├── nextjs-16.md
│   ├── astro-6.md
│   ├── nuxt-4.md
│   ├── laravel-13.md
│   ├── typescript-strict.md
│   ├── tailwind-4.md
│   ├── mongodb-laravel.md   # añadida 2026-06-08 (Skills Pendientes #1)
│   ├── devops-docker.md     # añadida 2026-06-08 (Skills Pendientes #4)
│   └── security.md          # añadida 2026-06-08 (Skills Pendientes #7)
│
├── memory/                  # Memoria persistente entre sesiones
│   ├── MEMORY.md            # Índice
│   ├── sessions/            # YYYY-MM-DD-HHmm.md por sesión
│   └── entities/            # Memorias nombradas por slug.md
│
└── guard/                   # Guardian Angel (pre-commit AI review)
    ├── AGENTS.md            # Reglas de revisión del stack
    ├── guard.sh             # Hook de pre-commit
    ├── install.sh           # Instalador del hook
    └── .cache/              # Cache de revisiones (hash → PASS/WARN)
```

---

## Protocolo SDD — Tres fases

### Fase 1: Preflight (detección)
Antes de cualquier código, identificar el contexto:
1. Leer `config.yaml` para stack y reglas de fase
2. Identificar proyecto objetivo (buscar manifests: `package.json`, `composer.json`, etc.)
3. Leer `CLAUDE.md` del proyecto (gobernanza: modo, branching, review)
4. Cargar registry del proyecto: `.sdd/registries/{proyecto}.yaml`

Si el proyecto es ambiguo o el cambio contradice la gobernanza → preguntar.

### Fase 2: Calibración (verificación)
No se construye nada. Se verifica que lo detectado es real y funciona.

Checklist por proyecto:
- **Dependencias**: lock file coherente con manifest, deps instaladas
- **Test runner**: si `ready: true`, ejecutar y confirmar que pasa
- **Lint**: si instalado, ejecutar y confirmar 0 errores
- **Build**: verificar que el proyecto compila
- **Config**: CLAUDE.md y registry coherentes con config.yaml
- **Entorno**: Docker corriendo, redes existentes, .env files, puertos libres

Si un check BLOCKER falla → resolver ANTES de continuar.

### Fase 3: Strict TDD (construcción)
Solo se entra cuando la calibración pasa.

```
RED    → escribir test que describe el comportamiento → ejecutar → FALLA
GREEN  → implementación mínima → ejecutar → PASA
REFACTOR → limpiar sin cambiar comportamiento → ejecutar → sigue PASANDO
```

Reglas:
- Sin código de producción sin test previo que lo exija
- Tests ejecutados en cada paso (RED, GREEN, REFACTOR)
- Un test que nunca falla no aporta confianza — verificar el RED
- Commits al menos uno por ciclo GREEN

---

## Comandos del CLI (platon.mjs)

| Comando | Acción |
|---------|--------|
| `/help` | Mostrar comandos disponibles |
| `/clear` | Limpiar pantalla y mostrar splash |
| `/end` | Guardar resumen de sesión y salir |
| `/mem list` | Listar sesiones y entidades guardadas |
| `/mem save <título>` | Guardar última respuesta del agente como entidad |
| `/mem search <consulta>` | Buscar texto en toda la memoria |
| `/decide [título]` | Capturar una decisión (preguntas guiadas) como entidad `type: decision` — añadido 2026-06-08 (Skills Pendientes #6) |
| `/delegate` | Formatear último plan para ejecutar en Claude Code |
| `/exit` | Salir sin guardar |

---

## Sistema de memoria (Engram-inspired)

Platón pierde toda memoria al cerrar la sesión si no se guarda. El sistema de memoria persiste decisiones y contexto.

### Sesiones
- Se guardan al ejecutar `/end` con un resumen de texto libre
- Archivo: `.sdd/memory/sessions/YYYY-MM-DD-HHmm.md`
- Las **últimas 3 sesiones** se inyectan automáticamente en el system prompt al iniciar

### Entidades
- Se guardan con `/mem save <título>` (guarda la última respuesta del agente)
- Archivo: `.sdd/memory/entities/{slug-del-título}.md`
- **Todas las entidades** se inyectan en el system prompt siempre

### Flujo de inyección
```
platon.mjs startup
  ├── loadMemory()  → lee sessions[-3:] + todas las entidades
  ├── loadSkills()  → lee todos los .md de .sdd/skills/
  └── buildSystemPrompt() = base + memoria + skills
                              ↓
                    systemPrompt inyectado al agente
```

### Búsqueda
`/mem search <consulta>` → búsqueda case-insensitive en todos los archivos de `sessions/` y `entities/`. Devuelve extractos de contexto.

---

## Skills del stack

10 archivos en `.sdd/skills/` con patrones para cada tecnología. Formato inspirado en Gentleman-Skills. Las últimas 3 se añadieron el 2026-06-08 al completar las 7 recomendaciones de [[Skills Pendientes]].

Cada skill incluye:
- **Principios core** con reglas claras
- **Ejemplos de código** comentados (✅ correcto / ❌ incorrecto)
- **Anti-patterns** a evitar

| Skill | Versión | Proyectos |
|-------|---------|-----------|
| `react-19.md` | React 19.x | web1-astro, web3-next |
| `nextjs-16.md` | Next.js 16.x | web3-next |
| `astro-6.md` | Astro 6.x | web1-astro |
| `nuxt-4.md` | Nuxt 4.x | web2-nuxt |
| `laravel-13.md` | Laravel 13.x | api-laravel |
| `typescript-strict.md` | TypeScript 5.x | web1-astro, web2-nuxt, web3-next |
| `tailwind-4.md` | Tailwind 4.x | web3-next |
| `mongodb-laravel.md` | MongoDB 7 + laravel-mongodb 5.7 | api-laravel |
| `devops-docker.md` | Docker/Traefik/WSL2 | transversal (los 4 proyectos) |
| `security.md` | Auth/CORS/CSP/validación | transversal (los 4 proyectos) |

Cada registry en `.sdd/registries/{proyecto}.yaml` tiene un campo `skills_ref` con los paths relevantes para ese proyecto.

Los skills se cargan completos en el system prompt de Platón (Opus 4.6 con max effort tiene contexto amplio).

---

## Delegation workflow (gentle-ai inspired)

Cuándo Platón debe producir un plan de delegación (no pasos sueltos):
- Leer 4+ archivos para entender un flujo
- Modificar 2+ archivos no triviales
- Operaciones git (commit, push, PR)
- Setup de entorno o instalación de deps
- Complejidad acumulada tras muchos turnos

Al ejecutar `/delegate`:
1. Platón formatea el último plan como prompt listo para Claude Code
2. El usuario lo copia y pega en una sesión normal de Claude Code
3. Claude Code (Sonnet) implementa con Strict TDD

```
Platón → plan → /delegate → prompt formateado → Claude Code → implementa
```

---

## Guardian Angel (pre-commit hook)

Pre-commit hook que revisa el diff con Claude antes de cada commit.

### Instalación
```bash
cd /mnt/d/Compartida/LIHER
bash .sdd/guard/install.sh
```

Instala como symlink (Unix) o copia (Git Bash Windows) en `.git/hooks/pre-commit`.

### Cómo funciona
1. Al hacer `git commit`, el hook se activa automáticamente
2. Obtiene archivos staged relevantes (`.php`, `.ts`, `.tsx`, `.astro`, `.vue`, `.css`, `.md`, Docker)
3. Comprueba caché: si el mismo diff ya fue revisado como PASS → skip
4. Envía el diff a `claude --print` con las reglas de `AGENTS.md`
5. Parsea la respuesta: `STATUS: PASS | WARN | BLOCK`
6. PASS → commit normal. WARN → commit con advertencias. BLOCK → commit rechazado

### Reglas de revisión (`AGENTS.md`)

| Categoría | Nivel | Reglas clave |
|-----------|-------|-------------|
| Seguridad | BLOCKER | Sin hardcoded secrets, sin eval() con input de usuario, SQL siempre vía ORM |
| Tests (api-laravel) | BLOCKER | Feature tests obligatorios, sin dd()/var_dump() |
| TypeScript | BLOCKER | Sin `any` ni `@ts-ignore` sin justificación |
| React 19 | WARNING | Sin useMemo/useCallback injustificados, sin forwardRef |
| Laravel | WARNING | Sin lógica en Controllers, sin User::all() sin paginación |
| Docker/Entorno | BLOCKER | Sin secrets en docker-compose, MongoDB no expuesto |
| Estilo | INFO | pint antes de commit en Laravel, eslint en frontends |

### Caché inteligente
- Hash del diff + hash de AGENTS.md → clave de caché
- Si PASS: guarda en `.sdd/guard/.cache/{hash}` → skip en el siguiente commit idéntico
- Cache se invalida automáticamente si cambia el diff o las reglas

### Bypass (con cuidado)
```bash
git commit --no-verify   # Omite el hook
```

---

## Modelos de IA

| Rol | Modelo | Esfuerzo | Dónde |
|-----|--------|----------|-------|
| Platón (planificador) | claude-opus-4-6 | max | CLI platon.mjs |
| Ejecutor | claude-sonnet-4-6 | default | Claude Code normal |
| Guardian Angel | claude (cualquier versión) | default | guard.sh |

---

## config.yaml (v2.0) — Secciones clave

- `identity` — nombre, símbolo, launcher
- `models` — planner (opus) + executor (sonnet)
- `delegation` — cuándo delegar, formato del prompt
- `stack` — proyectos con framework, versión, puerto, dominio
- `phases` — spec, implement, test, review, deploy
- `testing` — runner por proyecto, estado ready
- `calibration` — checks por proyecto (blocker/warning), resultado del último run
- `strict_tdd` — ciclo RED/GREEN/REFACTOR, scripts por proyecto

---

## skills.yaml (v2.1) — Secciones

- `skills_dir` — `.sdd/skills/` (directorio cargado por platon.mjs)
- `skills` — mapa de skill → archivo + proyectos que lo usan
- `registries` — índice de registries por proyecto
- `shared` — skills de infraestructura workspace (make, docker, portforward)
- `user` — skills de Claude Code (`/init`, `/commit`, `/review`, etc.)
- `mcp` — MCPs disponibles (filesystem, github, playwright, memory, context7, google_calendar, gmail, google_drive)
- `manifest_detection` — cómo detectar tipo de proyecto por archivo manifest

---

## Estado de tests por proyecto

| Proyecto | Test Runner | Estado |
|---------|------------|--------|
| api-laravel | PHPUnit 12 | ✓ Listo (`php artisan test`) |
| web3-next | Vitest + @vitejs/plugin-react + jsdom | Bootstrap listo: `make test-setup PROJECT=web3-next` |
| web1-astro | Vitest | Bootstrap listo: `make test-setup PROJECT=web1-astro` |
| web2-nuxt | @nuxt/test-utils + Vitest | Bootstrap listo: `make test-setup PROJECT=web2-nuxt` |

`.sdd/scripts/test-bootstrap.sh` (añadido 2026-06-08, [[Skills Pendientes]] #2)
instala el runner, genera `vitest.config.ts` y un `sanity.test` de ejemplo
dentro del contenedor de cada proyecto, y verifica con `npx vitest run`.
Requiere el stack arriba (`make up`). Tras la primera corrida exitosa,
actualizar `test_ready: true` en `config.yaml`.

`make calibrate [PROJECT=...]` (`.sdd/scripts/calibrate.sh`, añadido
2026-06-08, [[Skills Pendientes]] #3) ejecuta los 6 bloques de
`calibration.checks` y persiste `last_run`/`result`/`blockers`/`warnings`
en `calibration.status`.

**Primera ejecucion**: 2026-06-09. Resultado: `pass` (sin blockers).
Warnings conocidos:
- `api-laravel`: composer.json mas nuevo que el lockfile — pendiente de resolver
- `web3-next`: hallazgos ESLint — pendiente de resolver

E2E: Playwright MCP disponible workspace-wide para smoke tests sin instalación local.

---

Ver también: [[Home]], [[Comandos]], [[API Laravel]], [[Web3 Next]], [[Skills Pendientes]]
