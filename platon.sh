#!/bin/bash
# =============================================================================
# platon.sh — Launcher SDD (ΠΛΑΤΩΝ)
#
# Tres modos:
#   bash platon.sh            -> orquesta tmux (o fallback sin tmux)
#   bash platon.sh --splash   -> renderiza el dashboard (panel superior)
#   bash platon.sh --claude   -> lanza Claude Code con harness SDD (panel inferior)
#
# Desde WSL2:  cd /mnt/d/Compartida/LIHER && bash platon.sh
# Desde Git Bash: cd /d/Compartida/LIHER && bash platon.sh
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

# ── Render splash ────────────────────────────────────────────────────────────

render_splash() {
  IFS='|' read -r GIT_BRANCH GIT_COMMITS <<< "$(get_git_info)"
  local CALIBRATION
  CALIBRATION=$(get_calibration)

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

  echo -e "  ${BOLD}Projects          Tests    Skills${NC}"
  echo -e "  ${DIM}─────────────────────────────────${NC}"

  while IFS='|' read -r proj test_ready; do
    [ -z "$proj" ] && continue
    local skills
    skills=$(get_skill_count "$proj")
    printf -v padded "%-18s" "$proj"
    if [ "$test_ready" = "true" ]; then
      echo -e "  ${GREEN}+${NC}  ${padded}ready    ${skills}"
    else
      echo -e "  ${DIM}.${NC}  ${padded}${DIM}--${NC}       ${skills}"
    fi
  done <<< "$(get_projects)"

  echo ""

  local cal_color
  case "$CALIBRATION" in
    pass)    cal_color="$GREEN" ;;
    fail)    cal_color="$RED" ;;
    *)       cal_color="$YELLOW" ;;
  esac

  echo -e "  ${CYAN}SDD Phase${NC}    ${cal_color}${CALIBRATION}${NC}"
  echo -e "  ${DIM}─────────────────────────────────${NC}"
}

# ── Resolver comando de Claude Code ──────────────────────────────────────────

resolve_claude_cmd() {
  # Devuelve el comando para lanzar Claude Code segun el entorno.
  # Usa --append-system-prompt-file para cargar el harness SDD.
  local prompt_file="$SDD/platon-prompt.md"

  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # Git Bash — claude en PATH
      if [ -f "$prompt_file" ]; then
        claude --name "platon" --append-system-prompt-file "$prompt_file"
      else
        claude --name "platon"
      fi
      ;;
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        # ── WSL2 ──
        local NODE_BIN=""
        if command -v node &>/dev/null; then
          NODE_BIN="node"
        elif [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
          NODE_BIN="/mnt/c/Program Files/nodejs/node.exe"
        fi

        if [ -z "$NODE_BIN" ]; then
          echo -e "  ${RED}Error: node no encontrado${NC}" >&2
          exit 1
        fi

        local CLAUDE_CLI=""
        for d in \
          "/mnt/c/Users/Administrador/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/cli.js" \
          "/mnt/c/Users/$USER/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/cli.js"
        do
          [ -f "$d" ] && CLAUDE_CLI="$d" && break
        done

        if [ -z "$CLAUDE_CLI" ]; then
          echo -e "  ${RED}Error: claude-code CLI no encontrado${NC}" >&2
          exit 1
        fi

        # Convertir paths para node.exe de Windows
        local WIN_CLI
        if command -v wslpath &>/dev/null; then
          WIN_CLI=$(wslpath -w "$CLAUDE_CLI")
        else
          local drive="${CLAUDE_CLI:5:1}"
          WIN_CLI="${drive^^}:/${CLAUDE_CLI:7}"
        fi

        if [ -f "$prompt_file" ]; then
          local WIN_PROMPT
          if command -v wslpath &>/dev/null; then
            WIN_PROMPT=$(wslpath -w "$prompt_file")
          else
            local pd="${prompt_file:5:1}"
            WIN_PROMPT="${pd^^}:/${prompt_file:7}"
          fi
          "$NODE_BIN" "$WIN_CLI" --name "platon" --append-system-prompt-file "$WIN_PROMPT"
        else
          "$NODE_BIN" "$WIN_CLI" --name "platon"
        fi
      else
        # Linux nativo
        if [ -f "$prompt_file" ]; then
          claude --name "platon" --append-system-prompt-file "$prompt_file"
        else
          claude --name "platon"
        fi
      fi
      ;;
    *)
      claude --name "platon"
      ;;
  esac
}

# =============================================================================
# MODOS DE EJECUCION
# =============================================================================

case "${1:-}" in

  # ── Modo splash: panel superior de tmux ──────────────────────────────────
  --splash)
    clear
    render_splash
    # Mantener el panel vivo hasta que tmux cierre la sesion
    exec sleep infinity
    ;;

  # ── Modo claude: panel inferior de tmux ──────────────────────────────────
  --claude)
    resolve_claude_cmd
    # Cuando claude sale, matar la sesion tmux entera
    tmux kill-session -t platon 2>/dev/null || true
    ;;

  # ── Modo principal: orquestador ──────────────────────────────────────────
  *)
    if command -v tmux &>/dev/null; then
      # ── Con tmux: dos paneles ──
      tmux kill-session -t platon 2>/dev/null || true

      SPLASH_LINES=18

      # Sesion con splash en el panel superior
      tmux new-session -d -s platon \
        "bash \"$ROOT/platon.sh\" --splash"

      # Panel inferior con Claude Code + harness SDD
      tmux split-window -v -t platon \
        "bash \"$ROOT/platon.sh\" --claude"

      # Splash arriba (fijo), Claude abajo (expandido)
      tmux resize-pane -t platon:0.0 -y $SPLASH_LINES

      # Foco en el panel de Claude
      tmux select-pane -t platon:0.1

      # Borde entre paneles: linea simple
      tmux set-option -t platon pane-border-style "fg=colour240"
      tmux set-option -t platon pane-active-border-style "fg=colour93"

      # Desactivar la barra de estado de tmux (interfaz limpia)
      tmux set-option -t platon status off

      # Attach — exec reemplaza este proceso
      exec tmux attach -t platon
    else
      # ── Sin tmux: fallback ──
      clear
      render_splash
      echo ""
      echo -e "  ${DIM}(tmux no disponible — modo fallback)${NC}"
      echo ""
      resolve_claude_cmd
    fi
    ;;

esac
