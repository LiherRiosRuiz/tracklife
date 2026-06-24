#!/bin/bash
# =============================================================================
# panel.sh — Panel LIHER v2
#
# Layout: LIHER dominante (izquierda 75%) + panel de actividad (derecha 25%)
#
# Pane 0 (izq):  LIHER (gobernador) — interfaz principal
# Pane 1 (der):  Actividad en tiempo real (tail -f .sdd/activity.log)
#
# Status bar:    branch, commits, memoria, cronica, cambios
# Mouse:         habilitado (scroll nativo, resize de panes)
#
# Requisitos: tmux, node
# Uso: cd /d/Compartida/LIHER && bash panel.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="liher-panel"
ACTIVITY_LOG="$ROOT/.sdd/activity.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

# ── Resolver node ─────────────────────────────────────────────────────────────
find_node() {
  command -v node 2>/dev/null && return
  if [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
    echo "/mnt/c/Program Files/nodejs/node.exe"
    return
  fi
  return 1
}

# ── Verificaciones ────────────────────────────────────────────────────────────
if ! command -v tmux &>/dev/null; then
  echo -e "${RED}Error: tmux no esta instalado.${NC}"
  echo -e "${DIM}Instalar: sudo apt install -y tmux${NC}"
  exit 1
fi

NODE_BIN=$(find_node) || {
  echo -e "${RED}Error: node no encontrado.${NC}"
  echo -e "${DIM}Instalar Node.js (https://nodejs.org)${NC}"
  exit 1
}

# ── Pre-instalar dependencias ─────────────────────────────────────────────────
if [ ! -d "$ROOT/.sdd/cli/node_modules" ]; then
  echo -e "${DIM}Instalando dependencias del CLI...${NC}"
  NPM_BIN=$(command -v npm 2>/dev/null || echo "$(dirname "$NODE_BIN")/npm")
  (cd "$ROOT/.sdd/cli" && "$NPM_BIN" install --silent)
fi

# ── Inicializar activity log ──────────────────────────────────────────────────
: > "$ACTIVITY_LOG"
echo "$(date '+%H:%M:%S') Panel LIHER iniciado" >> "$ACTIVITY_LOG"

# ── Sesion existente: reanudar ────────────────────────────────────────────────
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo -e "${GREEN}Sesion '$SESSION' activa. Reanudando...${NC}"
  if [ -n "${TMUX:-}" ]; then
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
  exit 0
fi

# ── Crear sesion nueva ────────────────────────────────────────────────────────
echo -e "${DIM}Creando sesion LIHER...${NC}"

# Pane 0: LIHER (full width inicial)
tmux new-session -d -s "$SESSION" -c "$ROOT" -x 220 -y 55

# Pane 1: Actividad (split horizontal, 28% del ancho derecho)
tmux split-window -h -t "${SESSION}:0.0" -c "$ROOT" -l "28%"

# ── Configuracion global de la sesion ─────────────────────────────────────────

# Mouse: scroll nativo, resize de panes, click para focus
tmux set-option -t "$SESSION" mouse on

# Historial largo para scroll hacia atras
tmux set-option -t "$SESSION" history-limit 50000

# Colores del terminal
tmux set-option -t "$SESSION" default-terminal "screen-256color"

# ── Bordes de pane ────────────────────────────────────────────────────────────
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-style "fg=colour238"
tmux set-option -t "$SESSION" pane-active-border-style "fg=colour34"

# Etiquetas: LIHER verde brillante, actividad gris
PANE_LABEL='#{?#{==:#{pane_index},0},#[fg=colour34 bold] LIHER  ,#[fg=colour240] ACTIVIDAD  }'
tmux set-option -t "$SESSION" pane-border-format " ${PANE_LABEL}"

# No permitir que node.exe sobrescriba titulos
tmux set-window-option -t "$SESSION" allow-rename off
tmux set-window-option -t "$SESSION" automatic-rename off

# ── Status bar ────────────────────────────────────────────────────────────────
tmux set-option -t "$SESSION" status on
tmux set-option -t "$SESSION" status-interval 10
tmux set-option -t "$SESSION" status-style "bg=colour234,fg=colour248"
tmux set-option -t "$SESSION" status-position bottom

# Izquierdo: nombre + agentes (P·Q·V indican que están disponibles como background)
tmux set-option -t "$SESSION" status-left \
  "#[fg=colour34,bold] LIHER #[fg=colour238,nobold]│ #[fg=colour248]agentes: #[fg=colour135]Π#[fg=colour238]·#[fg=colour69]Q#[fg=colour238]·#[fg=colour34]V#[fg=colour238]  "
tmux set-option -t "$SESSION" status-left-length 50

# Derecho: status del workspace
tmux set-option -t "$SESSION" status-right "#[fg=colour240]#($ROOT/panel-status.sh)"
tmux set-option -t "$SESSION" status-right-length 100

# Ocultar lista de ventanas (solo usamos panes)
tmux set-window-option -t "$SESSION" window-status-format ""
tmux set-window-option -t "$SESSION" window-status-current-format ""

# ── Lanzar comandos ───────────────────────────────────────────────────────────

# Pane 0: LIHER
tmux send-keys -t "${SESSION}:0.0" "bash '$ROOT/liher.sh'" C-m

# Pane 1: Activity monitor
# tail -f para Git Bash (no tiene -f con --follow=name, usar simple tail -f)
tmux send-keys -t "${SESSION}:0.1" \
  "echo '  ACTIVIDAD'; echo '  Platón · Quevedo · Vinci'; echo '  ─────────────────────────'; tail -f '$ACTIVITY_LOG'" C-m

# ── Focus en LIHER ───────────────────────────────────────────────────────────
tmux select-pane -t "${SESSION}:0.0"

# ── Attach ────────────────────────────────────────────────────────────────────
if [ -n "${TMUX:-}" ]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach-session -t "$SESSION"
fi
