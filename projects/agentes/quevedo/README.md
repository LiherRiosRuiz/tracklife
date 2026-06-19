# QUEVEDO — Cronista del Workspace LIHER v1.0

Agente personalizado de documentacion y cronica para el workspace LIHER.
Basado en el framework Spec-Driven Development (SDD).

> *Conceptismo: precision, densidad, ni una palabra de mas.*

---

## Que es

Quevedo es un agente de IA especializado en **documentacion y cronica**. No planifica ni escribe codigo — mantiene el vault Obsidian actualizado y registra toda la actividad del workspace. Usa Claude Sonnet 4.6 para escritura agil y precisa.

```
Platon (Opus 4.6, max effort)     Quevedo (Sonnet 4.6, high)      Claude Code (Sonnet 4.6)
        PLANIFICA                      DOCUMENTA                       EJECUTA
```

---

## Como lanzarlo

```bash
cd /mnt/d/Compartida/LIHER
bash quevedo.sh
```

El launcher instala dependencias automaticamente si es la primera vez (comparte `node_modules/` con Platon).

---

## Estructura de archivos

```
LIHER/
├── quevedo.sh                   <- lanzador (punto de entrada)
│
└── .sdd/                        <- implementacion (carpeta oculta)
    ├── cli/
    │   └── quevedo.mjs          <- CLI principal (Node.js + Claude Agent SDK)
    ├── quevedo-prompt.md        <- system prompt del agente
    └── chronicle/               <- sistema de cronica
        ├── manifest.json        <- tracking de sesiones procesadas
        ├── daily/               <- logs diarios (YYYY-MM-DD.md)
        └── summaries/           <- resumenes por sesion
```

---

## Comandos del CLI

| Comando | Accion |
|---------|--------|
| `/chronicle` | Procesar sesiones recientes (Claude Code + Platon) |
| `/audit` | Analizar vault: huerfanas, enlaces rotos, coherencia |
| `/update <nota>` | Pedir al LLM que actualice una nota del vault |
| `/sync` | Chronicle + detectar notas que necesitan actualizacion |
| `/graph` | Mostrar mapa de wikilinks del vault |
| `/log [N]` | Mostrar ultimas N cronicas diarias (default: 3) |
| `/end` | Guardar cronica de sesion y salir |
| `/clear` | Limpiar pantalla |
| `/help` | Mostrar ayuda |
| `/exit` | Salir sin guardar |

---

## Sistema de cronica

Quevedo procesa dos fuentes de actividad:

### 1. Sesiones Claude Code
Lee los archivos JSONL de `~/.claude/projects/D--Compartida/`. Extrae mensajes de usuario y asistente, herramientas usadas, archivos tocados. Produce resumenes concisos.

### 2. Sesiones Platon
Lee los archivos `.md` de `.sdd/memory/sessions/`. Incluye los resumenes de planificacion ya guardados.

### Formato de cronica

```
.sdd/chronicle/
├── manifest.json           <- que sesiones ya se procesaron
├── daily/
│   ├── 2026-06-05.md       <- toda la actividad de ese dia
│   ├── 2026-06-06.md
│   └── 2026-06-07.md
└── summaries/
    └── ff0ba85a.md          <- resumen de una sesion individual
```

---

## Mantenimiento del vault

Quevedo comprende la estructura del vault Obsidian:

- **Grafo de wikilinks**: sabe que nota enlaza a cual
- **Deteccion de problemas**: huerfanas, enlaces rotos, notas sin "Ver tambien"
- **Actualizacion activa**: puede leer codigo y reescribir notas con informacion actual
- **Convenciones**: respeta titulos H1, tablas, bloques de codigo, wikilinks, estructura por tiers

---

## Diferencias con Platon

| Aspecto | Platon | Quevedo |
|---------|--------|---------|
| Rol | Planificador | Cronista / documentador |
| Modelo | claude-opus-4-6 (max) | claude-sonnet-4-6 (high) |
| Tools | Read-only | Read + Write + Edit |
| Salida | Planes para Claude Code | Documentacion del vault |
| Persistencia | `.sdd/memory/` | `.sdd/chronicle/` |

---

## Dependencias

| Requisito | Version |
|-----------|---------|
| Node.js | >= 22 |
| @anthropic-ai/claude-agent-sdk | ^0.3.165 |
| claude CLI | instalado globalmente |

Comparte `node_modules/` con Platon en `.sdd/cli/`.

---

## Contexto

- **Workspace**: LIHER (`D:\Compartida\LIHER`)
- **Categoria**: `projects/agentes/`
- **Documentacion extendida**: `docs/Quevedo.md`
