#!/bin/bash
# =============================================================================
# quevedo.sh — Launcher QUEVEDO
#
# Lanza el CLI del cronista (Agent SDK, sin banner de Claude Code).
# Instala dependencias automaticamente si es la primera vez.
#
# Desde WSL2:     cd /mnt/d/Compartida/LIHER && bash quevedo.sh
# Desde Git Bash: cd /d/Compartida/LIHER && bash quevedo.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$ROOT/.sdd/cli"
CLI_ENTRY="$CLI_DIR/quevedo.mjs"

RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

# ── Resolver node ────────────────────────────────────────────────────────────
find_node() {
  command -v node 2>/dev/null && return
  # WSL2: node.exe en Windows
  if [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
    echo "/mnt/c/Program Files/nodejs/node.exe"
    return
  fi
  return 1
}

NODE_BIN=$(find_node) || {
  echo -e "  ${RED}Error: node no encontrado${NC}"
  echo -e "  ${DIM}Instalar Node.js (https://nodejs.org)${NC}"
  exit 1
}

# ── Instalar dependencias si no existen ──────────────────────────────────────
if [ ! -d "$CLI_DIR/node_modules" ]; then
  echo -e "  ${DIM}Instalando dependencias del CLI...${NC}"
  (cd "$CLI_DIR" && npm install --silent)
fi

# ── Resolver path del CLI para el entorno ────────────────────────────────────
CLI_PATH="$CLI_ENTRY"

# En WSL2, node.exe necesita paths de Windows
if grep -qi microsoft /proc/version 2>/dev/null; then
  if command -v wslpath &>/dev/null; then
    CLI_PATH=$(wslpath -w "$CLI_ENTRY")
  else
    drive="${CLI_ENTRY:5:1}"
    CLI_PATH="${drive^^}:/${CLI_ENTRY:7}"
  fi
fi

# ── Lanzar ───────────────────────────────────────────────────────────────────
exec "$NODE_BIN" "$CLI_PATH"
