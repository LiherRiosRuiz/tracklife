# ΠΛΑΤΏΝ — Platón SDD Agent v2.0

Agente personalizado de planificación para el workspace LIHER.
Basado en el framework Spec-Driven Development (SDD).

> *Alegoría de la Caverna: ver con claridad antes de construir.*

---

## Qué es

Platón es un agente de IA especializado en **planificación**. No ejecuta ni escribe código — produce planes estructurados que Claude Code implementa. Usa Claude Opus 4.6 con esfuerzo máximo para análisis profundo.

```
Platón (Opus 4.6, max effort)        Claude Code (Sonnet 4.6)
        PLANIFICA              →              EJECUTA
           └── /delegate ──── plan ────────────┘
```

---

## Cómo lanzarlo

```bash
cd /mnt/d/Compartida/LIHER
bash platon.sh
```

El launcher instala dependencias automáticamente si es la primera vez.

---

## Estructura de archivos

```
LIHER/
├── platon.sh                    ← lanzador (punto de entrada)
│
└── .sdd/                        ← implementación (carpeta oculta)
    ├── cli/
    │   └── platon.mjs           ← CLI principal (Node.js + Claude Agent SDK)
    ├── config.yaml              ← configuración del workspace v2.0
    ├── skills.yaml              ← índice de registries y skills v2.1
    ├── platon-prompt.md         ← system prompt del agente
    ├── registries/              ← skills específicas por proyecto
    ├── skills/                  ← patrones del stack (7 tecnologías)
    ├── memory/                  ← memoria persistente entre sesiones
    └── guard/                   ← Guardian Angel (pre-commit hook)
```

La carpeta `.sdd/` está en la raíz de `LIHER/` por convención (igual que `.git/`, `.vscode/`). Es la configuración de workspace del agente.

---

## Comandos del CLI

| Comando | Acción |
|---------|--------|
| `/help` | Mostrar ayuda |
| `/clear` | Limpiar pantalla |
| `/end` | Guardar resumen de sesión y salir |
| `/mem list` | Ver sesiones y entidades guardadas |
| `/mem save <título>` | Guardar última respuesta como entidad |
| `/mem search <consulta>` | Buscar en toda la memoria |
| `/delegate` | Formatear último plan para Claude Code |
| `/exit` | Salir sin guardar |

---

## Protocolo SDD — 3 fases

Platón aplica siempre estas tres fases antes de proponer código:

### 1. Preflight
Identifica el proyecto, lee su `CLAUDE.md` y carga su registry de skills.
No asume nada — verifica el estado real del workspace.

### 2. Calibración
Verifica que el entorno funciona: dependencias, test runner, lint, build, Docker, redes.
Si un check bloqueante falla → se resuelve antes de continuar.

### 3. Strict TDD
Todo plan de código sigue el ciclo RED → GREEN → REFACTOR.
Sin código de producción sin un test previo que lo exija.

---

## Memoria persistente

Platón recuerda decisiones entre sesiones vía `.sdd/memory/`.

```bash
# Al terminar una sesión
/end          # Guarda resumen en .sdd/memory/sessions/

# Guardar una decisión importante
/mem save "Decisión: usar Zustand en lugar de Context"

# Buscar en sesiones anteriores
/mem search "mongodb"
```

---

## Skills del stack

Al iniciar, Platón carga automáticamente patrones para todas las tecnologías del workspace:

| Skill | Versión |
|-------|---------|
| React | 19.x |
| Next.js | 16.x |
| Astro | 6.x |
| Nuxt | 4.x |
| Laravel | 13.x |
| TypeScript | strict 5.x |
| Tailwind | 4.x |

---

## Guardian Angel (pre-commit hook)

Revisa cada commit con IA antes de que llegue al historial de git.

```bash
# Instalar (una vez)
bash .sdd/guard/install.sh

# Bypass si es necesario
git commit --no-verify
```

Reglas en `.sdd/guard/AGENTS.md`: seguridad, tests, TypeScript, Laravel, Docker.

---

## Dependencias

| Requisito | Versión |
|-----------|---------|
| Node.js | ≥ 22 |
| @anthropic-ai/claude-agent-sdk | ^0.3.165 |
| claude CLI | instalado globalmente |

Las dependencias de Node se instalan automáticamente en `.sdd/cli/node_modules/` al lanzar por primera vez.

---

## Contexto

- **Workspace**: LIHER (`D:\Compartida\LIHER`)
- **Categoría**: `projects/agentes/`
- **Documentación extendida**: `docs/Platon SDD.md`
