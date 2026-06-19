# Vinci — Ejecutor del Workspace LIHER

Agente ejecutor que implementa los planes producidos por Platon.
Opera exclusivamente como subagente de LIHER (no tiene launcher standalone).

> Leonardo da Vinci — el hombre que construia lo que otros solo imaginaban.

## Rol

| Aspecto | Detalle |
|---------|---------|
| Modelo | claude-sonnet-4-6 |
| Effort | high |
| Tools | Read, Write, Edit, Glob, Grep, Bash |
| Rol | Ejecutor pasivo |

## Que hace

1. Recibe un plan estructurado de Platon (via LIHER)
2. Ejecuta paso a paso en el orden indicado
3. Escribe codigo, crea archivos, corre comandos
4. Ejecuta tests despues de cada cambio
5. Reporta resultado a LIHER

## Que NO hace

- No planifica (eso lo hace Platon)
- No documenta (eso lo hace Quevedo)
- No cuestiona el plan salvo error tecnico evidente
- No agrega features fuera del plan

## Como lanzarlo

Vinci no tiene launcher standalone. Se invoca automaticamente via LIHER:

```bash
cd /mnt/d/Compartida/LIHER
bash liher.sh
# Dar una tarea de implementacion -> LIHER activa Platon + Vinci + Quevedo
```

## Archivos

| Archivo | Ubicacion |
|---------|-----------|
| Prompt | `.sdd/vinci-prompt.md` |
| Definicion | `.sdd/cli/liher.mjs` (como subagente) |
| Gobernanza | `projects/agentes/vinci/CLAUDE.md` |

## Relacion con otros agentes

```
LIHER (gobernador)
  ├── Platon → produce plan
  ├── Vinci  → ejecuta plan (este agente)
  └── Quevedo → documenta resultado
```

## Dependencias

- `@anthropic-ai/claude-agent-sdk` (compartido en `.sdd/cli/node_modules/`)
- Node.js 22+
