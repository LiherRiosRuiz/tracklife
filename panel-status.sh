#!/bin/bash
# =============================================================================
# panel-status.sh — Status line para tmux (liher-panel)
#
# Invocado por tmux status-right cada 10 segundos.
# Muestra: branch, ultimo commit, estado de memoria/cronica,
# y resumen de cambios por proyecto.
# =============================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Git info ────────────────────────────────────────────────────────────────
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
LAST_COMMIT=$(git -C "$ROOT" log -1 --format="%h %s" 2>/dev/null | cut -c1-40)

# ── Memoria/Cronica stats ───────────────────────────────────────────────────
SES_COUNT=$(find "$ROOT/.sdd/memory/sessions" -name "*.md" 2>/dev/null | wc -l)
ENT_COUNT=$(find "$ROOT/.sdd/memory/entities" -name "*.md" 2>/dev/null | wc -l)
CHR_COUNT=$(find "$ROOT/.sdd/chronicle/daily" -name "*.md" 2>/dev/null | wc -l)

# ── Cambios por proyecto ────────────────────────────────────────────────────
changes_summary() {
  local total=0
  for proj in web1-astro web2-nuxt web3-next api-laravel; do
    local dir="$ROOT/projects/web/$proj"
    if [ -d "$dir" ]; then
      local count
      count=$(git -C "$ROOT" status --short -- "projects/web/$proj" 2>/dev/null | wc -l)
      count=$((count + 0))
      if [ "$count" -gt 0 ]; then
        total=$((total + count))
      fi
    fi
  done
  echo "$total"
}

CHANGES=$(changes_summary)

# ── Componer output ─────────────────────────────────────────────────────────
# tmux status-right tiene espacio limitado (~80 chars util)
echo "$BRANCH | $LAST_COMMIT | mem:${SES_COUNT}s/${ENT_COUNT}e chr:${CHR_COUNT}d | chg:${CHANGES}"
