#!/bin/bash
# =============================================================================
# update-status.sh — Genera/actualiza docs/Estado del Sistema.md
#
# Recopila datos del workspace y escribe una nota Obsidian con:
#   - Estado git (branch, ultimo commit)
#   - Contadores de memoria (sesiones, entidades) y cronica
#   - Cambios pendientes por proyecto
#   - Ultima actividad de cada agente (derivada de archivos)
#
# Uso: bash update-status.sh
# Requisitos: git, find, wc (funciona en Git Bash y WSL2)
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$ROOT/docs/Estado del Sistema.md"

# ── Git info ────────────────────────────────────────────────────────────────
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconocido")
LAST_COMMIT=$(git -C "$ROOT" log -1 --format="%h — %s (%cr)" 2>/dev/null || echo "sin commits")

# ── Memoria/Cronica stats ───────────────────────────────────────────────────
SES_COUNT=$(find "$ROOT/.sdd/memory/sessions" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
ENT_COUNT=$(find "$ROOT/.sdd/memory/entities" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
CHR_COUNT=$(find "$ROOT/.sdd/chronicle/daily" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

# ── Ultima sesion de Platon ─────────────────────────────────────────────────
LAST_PLATON=$(find "$ROOT/.sdd/memory/sessions" -name "*.md" -printf '%f\n' 2>/dev/null | sort | tail -1 | sed 's/\.md$//' || echo "sin sesiones")
if [ -z "$LAST_PLATON" ] || [ "$LAST_PLATON" = "" ]; then
  LAST_PLATON=$(ls -1 "$ROOT/.sdd/memory/sessions/"*.md 2>/dev/null | sort | tail -1 | xargs -I{} basename {} .md || echo "sin sesiones")
fi

# ── Ultima cronica de Quevedo ───────────────────────────────────────────────
LAST_QUEVEDO=$(find "$ROOT/.sdd/chronicle/daily" -name "*.md" -printf '%f\n' 2>/dev/null | sort | tail -1 | sed 's/\.md$//' || echo "sin cronicas")
if [ -z "$LAST_QUEVEDO" ] || [ "$LAST_QUEVEDO" = "" ]; then
  LAST_QUEVEDO=$(ls -1 "$ROOT/.sdd/chronicle/daily/"*.md 2>/dev/null | sort | tail -1 | xargs -I{} basename {} .md || echo "sin cronicas")
fi

# ── Cambios por proyecto ────────────────────────────────────────────────────
project_changes() {
  local proj="$1"
  local dir="$ROOT/projects/web/$proj"
  if [ -d "$dir" ]; then
    local count
    count=$(git -C "$ROOT" status --short -- "projects/web/$proj" 2>/dev/null | wc -l | tr -d ' ')
    echo "$count"
  else
    echo "-"
  fi
}

CHG_WEB1=$(project_changes "web1-astro")
CHG_WEB2=$(project_changes "web2-nuxt")
CHG_WEB3=$(project_changes "web3-next")
CHG_API=$(project_changes "api-laravel")

# ── Timestamp ───────────────────────────────────────────────────────────────
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

# ── Generar nota ────────────────────────────────────────────────────────────
cat > "$OUTPUT" << MARKDOWN
# Estado del Sistema

> Generado automaticamente por \`update-status.sh\` el $TIMESTAMP.
> Ejecutar \`make status\` para actualizar.

---

## Git

| Campo | Valor |
|-------|-------|
| Branch | \`$BRANCH\` |
| Ultimo commit | $LAST_COMMIT |

---

## Agentes

| Agente | Rol | Modelo | Effort | Ultima actividad |
|--------|-----|--------|--------|------------------|
| [[Liher Agente\|LIHER]] | Gobernador | sonnet-4-6 | high | (orquesta bajo demanda) |
| [[Platon SDD\|Platon]] | Pensador | opus-4-6 | max | $LAST_PLATON |
| [[Quevedo]] | Cronista | sonnet-4-6 | high | $LAST_QUEVEDO |
| [[Vinci]] | Ejecutor | sonnet-4-6 | high | (rastro en git diff) |

---

## Memoria y cronica

| Almacen | Conteo | Ubicacion |
|---------|--------|-----------|
| Sesiones Platon | $SES_COUNT | \`.sdd/memory/sessions/\` |
| Entidades Platon | $ENT_COUNT | \`.sdd/memory/entities/\` |
| Cronicas Quevedo | $CHR_COUNT | \`.sdd/chronicle/daily/\` |

---

## Proyectos — cambios pendientes

| Proyecto | Framework | Dominio | Cambios |
|----------|-----------|---------|---------|
| [[Web1 Astro\|web1-astro]] | Astro 6 | web1.test | $CHG_WEB1 |
| [[Web2 Nuxt\|web2-nuxt]] | Nuxt 4 | web2.test | $CHG_WEB2 |
| [[Web3 Next\|web3-next]] | Next.js 16 | web3.test | $CHG_WEB3 |
| [[API Laravel\|api-laravel]] | Laravel 13 | api.test | $CHG_API |

---

## Panel tmux

El panel multi-agente (\`make panel\`) muestra esta misma informacion en tiempo real en terminal. Ver [[Lecciones - Panel Multiagente]] para detalles tecnicos.

---

Ver tambien: [[Home]], [[Liher Agente]], [[Platon SDD]], [[Quevedo]], [[Vinci]], [[Pendientes]]
MARKDOWN

echo "Estado actualizado: $OUTPUT"
