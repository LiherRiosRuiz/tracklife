# CLAUDE.md — Proyecto Quevedo

Agente cronista y documentador del workspace LIHER.
Ruta: `D:\Compartida\LIHER\projects\agentes\quevedo\`

> Esta carpeta es el punto de entrada humano al proyecto Quevedo.
> La implementacion real vive en `D:\Compartida\LIHER\.sdd/`.

---

## Modo de trabajo

**Este proyecto es infraestructura del workspace, no una aplicacion.**

- No hay Docker, no hay `make up`, no hay servidor de dev.
- El "runtime" de Quevedo es Node.js directamente via `bash quevedo.sh`.
- Cambios en `.sdd/` tienen efecto inmediato en la proxima sesion.

## Archivos criticos

| Archivo | Rol |
|---------|-----|
| `LIHER/.sdd/cli/quevedo.mjs` | CLI principal — punto de entrada del agente |
| `LIHER/.sdd/quevedo-prompt.md` | System prompt del agente |
| `LIHER/.sdd/chronicle/manifest.json` | Tracking de sesiones procesadas |
| `LIHER/.sdd/chronicle/daily/` | Logs diarios de actividad |
| `LIHER/.sdd/chronicle/summaries/` | Resumenes individuales por sesion |
| `LIHER/quevedo.sh` | Launcher (instala deps + lanza CLI) |

## Como probar cambios

```bash
# Verificar sintaxis del CLI
node --check /mnt/d/Compartida/LIHER/.sdd/cli/quevedo.mjs

# Lanzar para probar interactivamente
cd /mnt/d/Compartida/LIHER
bash quevedo.sh
```

## Fuentes de datos

Quevedo lee de dos fuentes para construir cronicas:

1. **Claude Code sessions**: `~/.claude/projects/D--Compartida/*.jsonl`
2. **Platon sessions**: `.sdd/memory/sessions/*.md`

## Vault que mantiene

Las notas del vault viven en `LIHER/docs/`. Quevedo puede leer y escribir esas notas.
Convenciones en `.sdd/quevedo-prompt.md`.

## Dependencias

```bash
# Node.js >= 22 requerido
node --version

# SDK compartido con Platon en .sdd/cli/node_modules/
# No instalar por separado
```

---

Ver tambien:
- `README.md` — documentacion de usuario de Quevedo
- `LIHER/docs/Quevedo.md` — nota del vault sobre el agente
- `LIHER/.sdd/` — implementacion completa
