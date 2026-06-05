#!/bin/bash
# =============================================================================
# platon.sh — Launcher SDD (ΠΛΑΤΩΝ)
# Muestra estado del workspace y lanza Claude Code con sesion "platon".
#   cd /mnt/d/Compartida/LIHER && bash platon.sh
# =============================================================================
set -euo pipefail

# ── Colores ANSI ─────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD="$ROOT/.sdd"

# ── Funciones de extraccion ──────────────────────────────────────────────────

get_git_info() {
  local branch commits
  branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
  commits=$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo "0")
  echo "$branch|$commits"
}

get_projects() {
  # Extrae nombres de proyecto y test_ready del skills.yaml
  if [ -f "$SDD/skills.yaml" ]; then
    awk '
      /^  [a-z].*:$/ && inside { name=$1; sub(/:$/,"",name) }
      /^registries:/ { inside=1; next }
      /^[a-z]/ && inside { inside=0 }
      inside && /test_ready:/ {
        val=$2
        gsub(/[[:space:]]/,"",val)
        print name "|" val
      }
    ' "$SDD/skills.yaml"
  fi
}

get_skill_count() {
  local project="$1"
  local registry="$SDD/registries/${project}.yaml"
  if [ -f "$registry" ]; then
    local total ready
    total=$(grep -cE '^  [a-z_]+:' "$registry" 2>/dev/null || true)
    ready=$(grep -c 'ready: true' "$registry" 2>/dev/null || true)
    total=${total:-0}
    ready=${ready:-0}
    echo "$ready/$total"
  else
    echo "--"
  fi
}

get_calibration() {
  if [ -f "$SDD/config.yaml" ]; then
    local result
    result=$(awk '/calibration:/{found=1} found && /result:/{print $2; exit}' "$SDD/config.yaml")
    echo "${result:-pendiente}"
  else
    echo "sin config"
  fi
}

# ── Recoger datos ────────────────────────────────────────────────────────────

IFS='|' read -r GIT_BRANCH GIT_COMMITS <<< "$(get_git_info)"
CALIBRATION=$(get_calibration)

# ── Splash ───────────────────────────────────────────────────────────────────

clear
echo ""
echo -e "  ${MAGENTA}${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "  ${MAGENTA}${BOLD}║${NC}           ${BOLD}Π Λ Α Τ Ω Ν${NC}              ${MAGENTA}${BOLD}║${NC}"
echo -e "  ${MAGENTA}${BOLD}║${NC}       ${DIM}Spec-Driven Development${NC}        ${MAGENTA}${BOLD}║${NC}"
echo -e "  ${MAGENTA}${BOLD}╚══════════════════════════════════════╝${NC}"
echo -e "  ${DIM}\"Primero, ver con claridad. Despues, construir.\"${NC}"
echo ""
echo -e "  ${CYAN}Workspace${NC}   ${BOLD}LIHER${NC}"
echo -e "  ${CYAN}Branch${NC}      ${GREEN}${GIT_BRANCH}${NC} ${DIM}(${GIT_COMMITS} commits)${NC}"
echo ""

# ── Tabla de proyectos ───────────────────────────────────────────────────────

echo -e "  ${BOLD}Projects          Tests    Skills${NC}"
echo -e "  ${DIM}─────────────────────────────────${NC}"

while IFS='|' read -r proj test_ready; do
  [ -z "$proj" ] && continue

  # Skill count
  skills=$(get_skill_count "$proj")

  # Formatear linea
  printf -v padded "%-18s" "$proj"
  if [ "$test_ready" = "true" ]; then
    echo -e "  ${GREEN}+${NC}  ${padded}ready    ${skills}"
  else
    echo -e "  ${DIM}.${NC}  ${padded}${DIM}--${NC}       ${skills}"
  fi
done <<< "$(get_projects)"

echo ""

# ── Estado de calibracion ────────────────────────────────────────────────────

case "$CALIBRATION" in
  pass)    cal_color="$GREEN" ;;
  fail)    cal_color="$RED" ;;
  *)       cal_color="$YELLOW" ;;
esac

echo -e "  ${CYAN}SDD Phase${NC}    ${cal_color}${CALIBRATION}${NC}"
echo -e "  ${DIM}─────────────────────────────────${NC}"
echo ""

# ── Lanzar Claude Code ───────────────────────────────────────────────────────

# Futuro tmux:
#   tmux new-session -d -s platon -n claude
#   tmux split-window -h
#   tmux send-keys -t platon:claude.0 "claude --name platon" Enter
#   tmux attach -t platon

exec claude --name "platon"
