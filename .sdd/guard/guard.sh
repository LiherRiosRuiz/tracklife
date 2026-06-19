#!/usr/bin/env bash
# =============================================================================
# guard.sh — Gentleman Guardian Angel · LIHER Workspace
#
# Pre-commit hook: revisa archivos staged con Claude contra AGENTS.md.
# Compatible: Git Bash (Windows), WSL2, macOS/Linux.
#
# Instalación: bash .sdd/guard/install.sh
# Manual:      cp .sdd/guard/guard.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Bypass:      git commit --no-verify  (úsalo con cuidado)
# =============================================================================
set -euo pipefail

# ── Resolver rutas ────────────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel)"
SDD_DIR="$REPO_ROOT/.sdd"
AGENTS_MD="$SDD_DIR/guard/AGENTS.md"
CACHE_DIR="$SDD_DIR/guard/.cache"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# ── Checks de entorno ─────────────────────────────────────────────────────────
if [ ! -f "$AGENTS_MD" ]; then
  echo -e "  ${YELLOW}⚠ Guardian Angel: AGENTS.md no encontrado en .sdd/guard/ — skip${NC}"
  exit 0
fi

if ! command -v claude &>/dev/null; then
  echo -e "  ${YELLOW}⚠ Guardian Angel: claude CLI no encontrado — skip${NC}"
  exit 0
fi

# ── Cache setup ───────────────────────────────────────────────────────────────
mkdir -p "$CACHE_DIR"

# ── Obtener archivos staged ───────────────────────────────────────────────────
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Filtrar archivos relevantes (código, no binarios ni lockfiles)
RELEVANT_FILES=""
while IFS= read -r file; do
  case "$file" in
    # Lockfiles y generados — skip
    *.lock|package-lock.json|composer.lock|*.min.js|*.min.css) continue ;;
    # Archivos de código relevantes
    *.php|*.ts|*.tsx|*.js|*.jsx|*.astro|*.vue|*.css|*.md) RELEVANT_FILES="$RELEVANT_FILES $file" ;;
    # Docker y config
    Dockerfile|docker-compose*.yml|*.env.example) RELEVANT_FILES="$RELEVANT_FILES $file" ;;
  esac
done <<< "$STAGED_FILES"

if [ -z "$RELEVANT_FILES" ]; then
  exit 0
fi

echo ""
echo -e "  ${CYAN}${BOLD}◉ Guardian Angel${NC} ${DIM}revisando commit...${NC}"

# ── Cache check ───────────────────────────────────────────────────────────────
# Hash de los archivos staged + AGENTS.md para invalidar si cambian las reglas
AGENTS_HASH=$(md5sum "$AGENTS_MD" 2>/dev/null | cut -d' ' -f1 || echo "nohash")
STAGED_HASH=$(git diff --cached 2>/dev/null | md5sum | cut -d' ' -f1)
CACHE_KEY="${STAGED_HASH:0:12}_${AGENTS_HASH:0:8}"
CACHE_FILE="$CACHE_DIR/$CACHE_KEY"

if [ -f "$CACHE_FILE" ]; then
  CACHED=$(cat "$CACHE_FILE")
  if [ "$CACHED" = "PASS" ]; then
    echo -e "  ${GREEN}✓ Guardian Angel: OK${NC} ${DIM}(cache)${NC}"
    echo ""
    exit 0
  fi
fi

# ── Obtener diff de archivos staged ──────────────────────────────────────────
DIFF=$(git diff --cached --unified=5 -- $RELEVANT_FILES 2>/dev/null)

if [ -z "$DIFF" ]; then
  exit 0
fi

# ── Construir prompt de revisión ──────────────────────────────────────────────
AGENTS_CONTENT=$(cat "$AGENTS_MD")

REVIEW_PROMPT="Eres un revisor de código. Revisa el siguiente git diff contra las reglas de AGENTS.md.

REGLAS (AGENTS.md):
${AGENTS_CONTENT}

GIT DIFF A REVISAR:
${DIFF}

Responde EXACTAMENTE en este formato:
STATUS: PASS | WARN | BLOCK
BLOCKERS: (lista de bloqueadores si STATUS=BLOCK, o 'ninguno')
WARNINGS: (lista de advertencias si STATUS=WARN, o 'ninguno')
SUMMARY: (1-2 líneas resumiendo el resultado)

Solo responde con este formato, nada más."

# ── Llamar a Claude CLI ───────────────────────────────────────────────────────
REVIEW=$(echo "$REVIEW_PROMPT" | claude --print 2>/dev/null || echo "STATUS: WARN
BLOCKERS: ninguno
WARNINGS: No se pudo conectar con Claude CLI
SUMMARY: Revisión omitida — Claude CLI no disponible")

# ── Parsear resultado ─────────────────────────────────────────────────────────
STATUS=$(echo "$REVIEW" | grep "^STATUS:" | head -1 | sed 's/STATUS: *//')
BLOCKERS=$(echo "$REVIEW" | grep "^BLOCKERS:" | head -1 | sed 's/BLOCKERS: *//')
WARNINGS=$(echo "$REVIEW" | grep "^WARNINGS:" | head -1 | sed 's/WARNINGS: *//')
SUMMARY=$(echo "$REVIEW" | grep "^SUMMARY:" | head -1 | sed 's/SUMMARY: *//')

# ── Mostrar resultado ─────────────────────────────────────────────────────────
echo ""
case "$STATUS" in
  PASS)
    echo -e "  ${GREEN}✓ Guardian Angel: OK${NC}"
    [ -n "$SUMMARY" ] && echo -e "  ${DIM}${SUMMARY}${NC}"
    echo ""
    echo "PASS" > "$CACHE_FILE"
    exit 0
    ;;
  WARN)
    echo -e "  ${YELLOW}⚠ Guardian Angel: WARNINGS${NC}"
    [ "$WARNINGS" != "ninguno" ] && echo -e "  ${YELLOW}${WARNINGS}${NC}"
    [ -n "$SUMMARY" ] && echo -e "  ${DIM}${SUMMARY}${NC}"
    echo ""
    echo "WARN" > "$CACHE_FILE"
    exit 0  # Warnings no bloquean
    ;;
  BLOCK)
    echo -e "  ${RED}✗ Guardian Angel: BLOQUEADO${NC}"
    echo -e "  ${RED}${BLOCKERS}${NC}"
    [ -n "$SUMMARY" ] && echo -e "  ${DIM}${SUMMARY}${NC}"
    echo ""
    echo -e "  ${DIM}Corrige los bloqueadores y vuelve a intentarlo.${NC}"
    echo -e "  ${DIM}Para omitir (con cuidado): git commit --no-verify${NC}"
    echo ""
    exit 1  # Bloquea el commit
    ;;
  *)
    # Status desconocido — no bloquear pero advertir
    echo -e "  ${YELLOW}⚠ Guardian Angel: respuesta inesperada — ${STATUS}${NC}"
    echo ""
    exit 0
    ;;
esac
