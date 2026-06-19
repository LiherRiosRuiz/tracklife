# CLAUDE.md — Vinci (Ejecutor)

Agente ejecutor del workspace LIHER. Subagente de LIHER.
No tiene CLI standalone — solo opera como subagente.

## Archivos criticos

| Archivo | Funcion |
|---------|---------|
| `.sdd/vinci-prompt.md` | System prompt del agente |
| `.sdd/cli/liher.mjs` | CLI gobernador donde Vinci esta definido como subagente |
| `projects/agentes/vinci/README.md` | Documentacion de usuario |

## Como probar cambios

1. Editar `.sdd/vinci-prompt.md` (cambios al prompt)
2. Verificar sintaxis: `node --check .sdd/cli/liher.mjs`
3. Lanzar: `bash liher.sh`
4. Dar una tarea de implementacion para que LIHER active Vinci
5. Verificar que Vinci ejecuta el plan correctamente

## Modo de trabajo

- Vinci es **infraestructura**, no aplicacion
- Su prompt define el comportamiento de ejecucion
- Su definicion como subagente esta en `liher.mjs` (tools, model, effort, maxTurns)
- No modificar tools de Vinci sin verificar que LIHER sigue funcionando

## Scope

Vinci ejecuta planes de cualquier proyecto del workspace.
No tiene scope limitado — implementa lo que Platon le indique.
