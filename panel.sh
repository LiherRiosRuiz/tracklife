#!/bin/bash
# =============================================================================
# panel.sh — Panel Multi-Agente LIHER
#
# Crea o reanuda una sesion tmux con 4 paneles (cuadricula 2x2):
#   Pane 0 (arriba-izq): LIHER (gobernador)
#   Pane 1 (arriba-der): Platon (pensador)
#   Pane 2 (abajo-izq):  Quevedo (cronista)
#   Pane 3 (abajo-der):  Vinci (monitor de actividad)
#
# Status bar: muestra branch, ultimo commit, memoria, cronica, cambios.
#
# Requisitos: tmux, node, WSL2
# Uso: cd /mnt/d/Compartida/LIHER && bash panel.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="liher-panel"

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

# ── Resolver node (misma logica que liher.sh/platon.sh/quevedo.sh) ───────────
find_node() {
  command -v node 2>/dev/null && return
  # WSL2: node.exe en Windows
  if [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
    echo "/mnt/c/Program Files/nodejs/node.exe"
    return
  fi
  return 1
}

# ── Verificaciones ──────────────────────────────────────────────────────────

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

# ── Pre-instalar dependencias (evita race condition de 3 launchers) ─────────

if [ ! -d "$ROOT/.sdd/cli/node_modules" ]; then
  echo -e "${DIM}Instalando dependencias del CLI (una sola vez)...${NC}"
  NPM_BIN=$(command -v npm 2>/dev/null || echo "$(dirname "$NODE_BIN")/npm")
  (cd "$ROOT/.sdd/cli" && "$NPM_BIN" install --silent)
fi

# ── Sesion tmux existente: reanudar ─────────────────────────────────────────

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo -e "${GREEN}Sesion '$SESSION' ya existe. Reanudando...${NC}"
  if [ -n "${TMUX:-}" ]; then
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
  exit 0
fi

# ── Crear mini-script para watch de Vinci ───────────────────────────────────

cat > "$ROOT/.panel-vinci-watch.sh" << 'WATCHEOF'
#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== git status (projects/) ==="
git -C "$ROOT" status --short -- projects/ 2>/dev/null || echo "(sin cambios)"
echo ""
echo "=== git diff --stat (projects/) ==="
git -C "$ROOT" diff --stat -- projects/ 2>/dev/null || echo "(sin diff)"
WATCHEOF
chmod +x "$ROOT/.panel-vinci-watch.sh"

# ── Crear sesion nueva ──────────────────────────────────────────────────────

echo -e "${DIM}Creando sesion tmux '$SESSION'...${NC}"

# Pane 0 (arriba-izq): LIHER — crear la sesion con este pane
tmux new-session -d -s "$SESSION" -c "$ROOT" -x 200 -y 50

# Pane 1 (arriba-der): Platon — split horizontal del pane 0
tmux split-window -h -t "${SESSION}:0.0" -c "$ROOT"

# Pane 2 (abajo-izq): Quevedo — split vertical del pane 0
tmux split-window -v -t "${SESSION}:0.0" -c "$ROOT"

# Pane 3 (abajo-der): Vinci monitor — split vertical del pane 1
tmux split-window -v -t "${SESSION}:0.1" -c "$ROOT"

# ── Ecualizar paneles (cuadricula 2x2) ─────────────────────────────────────
tmux select-layout -t "$SESSION" tiled

# ── Lanzar comandos en cada pane ────────────────────────────────────────────

# Pane 0: LIHER (gobernador)
tmux send-keys -t "${SESSION}:0.0" "bash '$ROOT/liher.sh'" C-m

# Pane 1: Platon (pensador)
tmux send-keys -t "${SESSION}:0.1" "bash '$ROOT/platon.sh'" C-m

# Pane 2: Quevedo (cronista)
tmux send-keys -t "${SESSION}:0.2" "bash '$ROOT/quevedo.sh'" C-m

# Pane 3: Vinci (monitor de actividad git)
tmux send-keys -t "${SESSION}:0.3" "echo '── VINCI (monitor) ──────────────────────────────────────'; echo 'Vinci opera embebido en LIHER como subagente.'; echo 'Este panel muestra las huellas de su trabajo:'; echo 'cambios en el working tree de git en projects/.'; echo ''; watch -n 5 bash '$ROOT/.panel-vinci-watch.sh'" C-m

# ── Configurar status bar ───────────────────────────────────────────────────

# Estilo de la status bar
tmux set-option -t "$SESSION" status on
tmux set-option -t "$SESSION" status-interval 10
tmux set-option -t "$SESSION" status-style "bg=colour235,fg=colour248"

# Lado izquierdo: nombre de la sesion
tmux set-option -t "$SESSION" status-left "#[fg=colour46,bold] LIHER-PANEL #[fg=colour248,nobold]│ "
tmux set-option -t "$SESSION" status-left-length 20

# Lado derecho: output del script de status
tmux set-option -t "$SESSION" status-right "#[fg=colour248]#($ROOT/panel-status.sh)"
tmux set-option -t "$SESSION" status-right-length 100

# Formato de ventana en la barra (ocultar — solo usamos panes)
tmux set-window-option -t "$SESSION" window-status-format ""
tmux set-window-option -t "$SESSION" window-status-current-format ""

# ── Poner etiquetas a los panes (border-status) ────────────────────────────
# Usamos pane_index (estable) en vez de pane_title (node.exe lo sobrescribe)
tmux set-option -t "$SESSION" pane-border-status top
PANE_LABEL='#{?#{==:#{pane_index},0},LIHER (gobernador),#{?#{==:#{pane_index},1},PLATON (pensador),#{?#{==:#{pane_index},2},QUEVEDO (cronista),VINCI (monitor)}}}'
tmux set-option -t "$SESSION" pane-border-format "#{?pane_active,#[fg=colour46],#[fg=colour240]} ${PANE_LABEL} "

# Desactivar allow-rename para que node.exe no sobrescriba titulos de ventana
tmux set-window-option -t "$SESSION" allow-rename off
tmux set-window-option -t "$SESSION" automatic-rename off

# ── Seleccionar pane inicial (LIHER) ────────────────────────────────────────
tmux select-pane -t "${SESSION}:0.0"

# ── Attach ──────────────────────────────────────────────────────────────────
if [ -n "${TMUX:-}" ]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach-session -t "$SESSION"
fi
