# Quevedo

Agente cronista del workspace LIHER. Mantiene el registro de actividad y la documentacion del vault actualizada.

> Francisco de Quevedo y Villegas — conceptismo: precision y densidad.

---

## Que hace

| Funcion | Descripcion |
|---------|-------------|
| Cronica | Procesa sesiones de Claude Code y Platon, extrae resumenes |
| Documentacion | Actualiza notas del vault basandose en actividad reciente |
| Auditoria | Detecta problemas en el vault: huerfanas, enlaces rotos, incoherencias |
| Grafo | Visualiza el mapa de wikilinks del vault |

---

## Como lanzarlo

```bash
cd /mnt/d/Compartida/LIHER
bash quevedo.sh
```

---

## Arquitectura

```
Quevedo (Sonnet 4.6, high)
    │
    ├── Lee sesiones JSONL (Claude Code)
    ├── Lee sesiones .md (Platon)
    │
    ├── Escribe cronicas en .sdd/chronicle/
    └── Actualiza notas en docs/
```

**Diferencia con Platon**: Platon planifica (read-only, Opus). Quevedo documenta (read-write, Sonnet).

---

## Comandos

| Comando | Accion |
|---------|--------|
| `/chronicle` | Procesar sesiones no procesadas |
| `/audit` | Detectar problemas en el vault |
| `/update <nota>` | Actualizar una nota con info actual |
| `/sync` | Chronicle + analisis del vault |
| `/graph` | Mapa visual de wikilinks |
| `/log [N]` | Ver ultimas cronicas diarias |
| `/end` | Guardar y salir |

---

## Sistema de cronica

Fuentes:
- `~/.claude/projects/D--Compartida/*.jsonl` — sesiones Claude Code
- `.sdd/memory/sessions/*.md` — sesiones Platon

Salida:
- `.sdd/chronicle/daily/YYYY-MM-DD.md` — log diario
- `.sdd/chronicle/summaries/<id>.md` — resumen por sesion
- `.sdd/chronicle/manifest.json` — tracking de procesamiento

---

## Archivos

| Archivo | Ubicacion |
|---------|-----------|
| CLI | `.sdd/cli/quevedo.mjs` |
| Prompt | `.sdd/quevedo-prompt.md` |
| Launcher | `quevedo.sh` |
| Cronicas | `.sdd/chronicle/` |
| Docs proyecto | `projects/agentes/quevedo/` |

---

## Protocolo de workflow (desde 2026-06-13)

**Cualquier mejora o cambio en el workspace pasa por Quevedo antes de implementarse.**

- Quevedo narra la peticion del usuario al inicio de cada sesion.
- Quevedo documenta el resultado al final.
- Esto garantiza que la cronica del vault refleje la actividad real y que
  las decisiones queden registradas antes de que el codigo cambie.

Esto no implica que Quevedo ejecute cambios de codigo — solo que documenta
antes y despues. La ejecucion sigue siendo de Vinci (via Liher).

---

## Historial de bugs conocidos

### 2026-06-09 — Falsos positivos en `buildVaultGraph`

**Sintomas**: el splash del CLI mostraba 7 enlaces rotos que no eran rotos.

**Bug A — pipe escapado en tablas Markdown**: Obsidian exige `[[Nota\|Alias]]`
(con `\|`) dentro de celdas de tabla. El regex original capturaba `Nota\`
(barra invertida incluida) como nombre de destino — un nodo inexistente.
Afectaba a 6 wikilinks de `Estado del Sistema.md` que usaban alias con pipe.

**Bug B — archivos `.canvas` ignorados**: `buildVaultGraph` solo inicializaba
nodos desde `.md`. `[[Mapa de Agentes]]` apunta a `Mapa de Agentes.canvas`,
que existe, pero se contaba como roto.

**Fix** en `.sdd/cli/quevedo.mjs`, funcion `buildVaultGraph`:
1. Nodos inicializados tambien desde archivos `.canvas`.
2. `.replace(/\\$/, "")` sobre el destino de cada enlace, eliminando la
   barra invertida residual del pipe escapado de Obsidian.

Las notas del vault no se modificaron — el `\|` en tablas es sintaxis correcta.

### 2026-06-19 — Falsos positivos por code spans en `buildVaultGraph`

**Sintomas**: el splash del CLI mostraba 2 enlaces rotos que no eran rotos.

**Causa**: `buildVaultGraph` parseaba wikilinks sobre el contenido raw del
archivo, sin excluir bloques de codigo ni inline code spans. Las notas
`docs/Cronica.md` y `docs/Quevedo.md` usan `[[Nota\|Alias]]` como ejemplo
de sintaxis dentro de backticks. El parser lo trataba como enlace real y
buscaba el nodo `Nota\` — inexistente.

**Fix** en `.sdd/cli/quevedo.mjs`, funcion `buildVaultGraph`: strip de
bloques de codigo e inline code spans antes de aplicar el regex de wikilinks:
```javascript
const content = raw
  .replace(/```[\s\S]*?```/g, "")
  .replace(/`[^`\n]+`/g, "");
```

El fix se aplica sobre la variable `content` que alimenta el regex —
el contenido en disco de las notas no se toca.

---

Ver tambien: [[Home]], [[Platon SDD]], [[Comandos]], [[Pendientes]]
