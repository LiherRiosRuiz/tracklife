#!/usr/bin/env bash
# =============================================================================
# install.sh — Instala el Guardian Angel pre-commit hook
#
# Uso (desde raíz del repo):
#   bash .sdd/guard/install.sh
#
# Desinstalar:
#   rm .git/hooks/pre-commit
# =============================================================================
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "  Error: no se encontró repositorio git. Ejecuta desde dentro del repo."
  exit 1
}

GUARD_SRC="$REPO_ROOT/.sdd/guard/guard.sh"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"

# Verificar que guard.sh existe
if [ ! -f "$GUARD_SRC" ]; then
  echo "  Error: no se encontró .sdd/guard/guard.sh"
  exit 1
fi

# Backup si ya existe un hook
if [ -f "$HOOK_DST" ]; then
  BACKUP="${HOOK_DST}.bak.$(date +%Y%m%d-%H%M%S)"
  cp "$HOOK_DST" "$BACKUP"
  echo "  ↩ Backup del hook anterior: $BACKUP"
fi

# Instalar hook (symlink en Unix, copia en Windows/Git Bash)
if command -v ln &>/dev/null && [[ "$OSTYPE" != "msys" ]]; then
  ln -sf "$GUARD_SRC" "$HOOK_DST"
  echo "  ✓ Hook instalado como symlink"
else
  cp "$GUARD_SRC" "$HOOK_DST"
  echo "  ✓ Hook instalado como copia"
fi

chmod +x "$HOOK_DST"

# Crear directorio de cache
mkdir -p "$REPO_ROOT/.sdd/guard/.cache"
echo "  ✓ Cache dir: .sdd/guard/.cache/"

echo ""
echo "  Guardian Angel activo en: $HOOK_DST"
echo ""
echo "  Comandos:"
echo "    gga run           → revisar staged ahora"
echo "    git commit --no-verify → bypass (usar con cuidado)"
echo "    rm .git/hooks/pre-commit → desinstalar"
echo ""
